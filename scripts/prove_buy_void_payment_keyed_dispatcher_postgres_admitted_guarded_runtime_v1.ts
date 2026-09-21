#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLE_ENV_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1,
  runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
} from "../src/economic/buy_void_payment_keyed_full_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";

const LEASE: BuyVoidPaymentKeyedDispatcherLeaseV1 = {
  marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  attempt_id: "1".repeat(64),
  lease_gen: 1n,
  lease_token: "2".repeat(32),
  worker_id: "postgres-admitted-guarded-runtime-proof",
  lease_expires_us: 2_000_000n,
};

const envNames = [
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLE_ENV_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.rpc_url,
] as const;
const original = new Map<string, string | undefined>(
  envNames.map((name) => [name, process.env[name]]),
);

try {
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1,
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1",
  );
  const authority =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_AUTHORITY_V1;
  assert.equal(authority.source_only_composition, true);
  assert.equal(authority.disabled_by_default, true);
  assert.equal(authority.caller_configuration_authority, false);
  assert.equal(authority.caller_pool_authority, false);
  assert.equal(authority.caller_factory_authority, false);
  assert.equal(authority.caller_root_dir_authority, false);
  assert.equal(authority.caller_stage_authority, false);
  assert.equal(authority.fixed_postgres_identity, true);
  assert.equal(authority.fixed_systemd_credential_ids, true);
  assert.equal(authority.connection_factory_constructed_internally, true);
  assert.equal(authority.live_schema_admission_required_before_worker, true);
  assert.equal(authority.schema_admission_database_mutation_allowed, false);
  assert.equal(authority.same_admitted_factory_pool_reused_for_worker, true);
  assert.equal(authority.bounded_guarded_broadcast_worker_required, true);
  assert.equal(authority.factory_close_after_command, true);
  assert.equal(authority.automatic_retry, false);
  assert.equal(authority.runtime_route_mount, false);

  const invalid =
    await runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1({
      lease: LEASE,
      pool: {},
    } as any);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.stage, "input");
  assert.equal(invalid.reason, "input_invalid");
  assert.equal(invalid.credential_read_performed, false);
  assert.equal(invalid.schema_query_performed, false);
  assert.equal(invalid.schema_admission_database_mutation_performed, false);
  assert.equal(invalid.dispatcher_database_mutation_may_have_occurred, false);
  assert.equal(invalid.worker_invoked, false);

  process.env[
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLE_ENV_V1
  ] = "0";
  process.env[VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled] = "1";
  process.env[
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled
  ] = "1";
  const disabled =
    await runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1({
      lease: LEASE,
    });
  assert.equal(disabled.ok, false);
  assert.equal(disabled.stage, "disabled");
  assert.equal(
    disabled.reason,
    "postgres_admitted_guarded_runtime_disabled",
  );
  assert.equal(disabled.credential_read_performed, false);

  process.env[
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLE_ENV_V1
  ] = "1";
  process.env[VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled] = "0";
  const fullDisabled =
    await runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1({
      lease: LEASE,
    });
  assert.equal(fullDisabled.ok, false);
  assert.equal(fullDisabled.stage, "runtime_gate");
  assert.equal(fullDisabled.reason, "full_runtime_disabled");
  assert.equal(fullDisabled.credential_read_performed, false);

  process.env[VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled] = "1";
  process.env[
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled
  ] = "0";
  const applyDisabled =
    await runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1({
      lease: LEASE,
    });
  assert.equal(applyDisabled.ok, false);
  assert.equal(applyDisabled.stage, "runtime_gate");
  assert.equal(applyDisabled.reason, "full_runtime_apply_disabled");
  assert.equal(applyDisabled.credential_read_performed, false);

  process.env[
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled
  ] = "1";
  delete process.env[
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.rpc_url
  ];
  const policyHeld =
    await runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1({
      lease: LEASE,
    });
  assert.equal(policyHeld.ok, false);
  assert.equal(policyHeld.stage, "runtime_policy");
  assert.match(String(policyHeld.reason), /^runtime_policy_/);
  assert.equal(policyHeld.credential_read_performed, false);
  assert.equal(policyHeld.schema_query_performed, false);
  assert.equal(policyHeld.worker_invoked, false);

  const source = fs.readFileSync(
    new URL(
      "../src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts",
      import.meta.url,
    ),
    "utf8",
  );
  for (const required of [
    "createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1",
    "admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1",
    "applyBuyVoidPaymentKeyedDispatcherGuardedBroadcastV1",
    "buyVoidPaymentKeyedFullRuntimePolicyStateV1",
    "buyVoidPaymentKeyedFullRuntimeRootDirV1",
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1",
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1",
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1",
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1",
    "schema_admission_identity_mismatch",
    "worker_exception_after_entry",
    "composition_exception_after_factory_ready",
    "factoryDecision.close()",
    "schema_admission_database_mutation_performed",
    "dispatcher_database_mutation_may_have_occurred",
  ]) {
    assert.equal(source.includes(required), true, "missing binding: " + required);
  }

  for (const forbidden of [
    "input.pool",
    "input.factory",
    "input.postgres",
    "input.root_dir",
    "input.stage",
    "input.signer",
    "input.broadcaster",
    "input.rpc_url",
    "input.env",
    "env: NodeJS.ProcessEnv",
    "automatic_retry: true",
    "runtime_route_mount: true",
  ]) {
    assert.equal(source.includes(forbidden), false, "forbidden authority: " + forbidden);
  }

  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1_PROOF_GREEN",
  );
  console.log("caller_pool_authority=false");
  console.log("caller_factory_authority=false");
  console.log("caller_configuration_authority=false");
  console.log("server_process_environment_configuration=true");
  console.log("internal_connection_factory_required=true");
  console.log("live_schema_admission_required_before_worker=true");
  console.log("same_admitted_pool_reused_for_worker=true");
  console.log("runtime_route_mount=false");
  console.log("live_postgres_composition_exercised=false");
  console.log("signing_exercised=false");
  console.log("transaction_broadcast_exercised=false");
  console.log("money_movement_exercised=false");
} finally {
  for (const name of envNames) {
    const value = original.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
