#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLE_ENV_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1,
  runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
} from "../src/economic/buy_void_payment_keyed_full_runtime_v1.js";

const ATTEMPT = "1".repeat(64);
const command = {
  attempt_id: ATTEMPT,
  apply: true,
  confirmation:
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1,
} as const;

const authority =
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_AUTHORITY_V1;

for (const [key, expected] of Object.entries({
  source_only_composition: true,
  runtime_route_mount: false,
  disabled_by_default: true,
  exact_enable_value_required: true,
  exact_apply_true_required: true,
  exact_confirmation_required: true,
  caller_attempt_id_selection_only: true,
  caller_root_dir_authority: false,
  caller_client_id_authority: false,
  caller_worker_id_authority: false,
  caller_lease_authority: false,
  caller_lease_ttl_authority: false,
  caller_postgres_authority: false,
  caller_pool_authority: false,
  caller_factory_authority: false,
  caller_signer_authority: false,
  caller_broadcaster_authority: false,
  caller_rpc_url_authority: false,
  server_enqueue_required: true,
  server_claim_required: true,
  fixed_enqueue_client_id: true,
  fixed_claim_worker_id: true,
  fixed_claim_lease_policy: true,
  live_schema_admission_before_dispatcher_mutation: true,
  claim_factory_closed_before_child: true,
  fresh_child_factory_revalidation_required: true,
  lease_capability_returned: false,
  raw_signed_transaction_returned: false,
  automatic_retry: false,
  background_loop: false,
  service_mutation: false,
  signing_possible_only_inside_admitted_child: true,
  transaction_broadcast_possible_only_inside_admitted_child: true,
  money_movement_possible_only_inside_admitted_child: true,
})) {
  assert.equal((authority as any)[key], expected, key);
}

const envKeys = new Set<string>([
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLE_ENV_V1,
  ...Object.values(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1,
  ),
  ...Object.values(VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1),
]);
const saved = new Map<string, string | undefined>();
for (const key of envKeys) {
  saved.set(key, process.env[key]);
  delete process.env[key];
}

try {
  {
    const result =
      await runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1({
        ...command,
        caller_worker_id: "forbidden",
      });
    assert.equal(result.ok, false);
    assert.equal(result.stage, "input");
    assert.equal(result.credential_read_performed, false);
    assert.equal(result.schema_query_performed, false);
    assert.equal(result.lease_capability_issued, false);
    assert.equal(result.lease_capability_returned, false);
    assert.equal(result.child_invoked, false);
    assert.equal(result.broadcast_call_performed, false);
    assert.equal(result.money_movement_performed, false);
  }

  {
    const result =
      await runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1({
        ...command,
        apply: false,
      });
    assert.equal(result.ok, false);
    assert.equal(result.stage, "input");
    assert.equal(result.reason, "input_invalid_or_explicit_authority_missing");
    assert.equal(result.credential_read_performed, false);
  }

  {
    const result =
      await runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1(command);
    assert.equal(result.ok, false);
    assert.equal(result.stage, "disabled");
    assert.equal(result.reason, "postgres_claimed_runtime_disabled");
    assert.equal(result.credential_read_performed, false);
    assert.equal(result.dispatcher_database_mutation_may_have_occurred, false);
  }

  process.env[
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLE_ENV_V1
  ] = "1";

  {
    const result =
      await runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1(command);
    assert.equal(result.ok, false);
    assert.equal(result.stage, "runtime_gate");
    assert.equal(result.reason, "admitted_guarded_runtime_disabled");
    assert.equal(result.credential_read_performed, false);
  }

  process.env[
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1
      .enabled
  ] = "1";

  {
    const result =
      await runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1(command);
    assert.equal(result.ok, false);
    assert.equal(result.stage, "runtime_gate");
    assert.equal(result.reason, "full_runtime_disabled");
    assert.equal(result.credential_read_performed, false);
  }

  process.env[VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled] = "1";

  {
    const result =
      await runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1(command);
    assert.equal(result.ok, false);
    assert.equal(result.stage, "runtime_gate");
    assert.equal(result.reason, "full_runtime_apply_disabled");
    assert.equal(result.credential_read_performed, false);
  }

  process.env[VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled] =
    "1";

  {
    const result =
      await runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1(command);
    assert.equal(result.ok, false);
    assert.equal(result.stage, "runtime_policy");
    assert.equal(result.credential_read_performed, false);
    assert.equal(result.schema_query_performed, false);
    assert.equal(result.child_invoked, false);
    assert.equal(result.money_movement_may_have_occurred, false);
  }
} finally {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.ts",
  ),
  "utf8",
);

for (const required of [
  "createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1",
  "admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1",
  "createBuyVoidPaymentKeyedDispatcherPostgresStoreV1",
  "enqueueBuyVoidPaymentKeyedPreparedAttemptV1",
  "claimBuyVoidPaymentKeyedPreparedAttemptV1",
  "runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1",
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CLIENT_ID_V1",
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_WORKER_ID_V1",
]) {
  assert.match(source, new RegExp(required));
}

const enqueueCall = source.indexOf(
  "await enqueueBuyVoidPaymentKeyedPreparedAttemptV1",
);
const claimCall = source.indexOf(
  "await claimBuyVoidPaymentKeyedPreparedAttemptV1",
);
const childCall = source.indexOf(
  "await runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1",
);
assert.ok(enqueueCall >= 0);
assert.ok(claimCall > enqueueCall);
assert.ok(childCall > claimCall);

assert.doesNotMatch(
  source,
  /from "\.\/buy_void_payment_keyed_(?:custodian_signer|custodian_broadcast)_v1\.js"/,
);
assert.doesNotMatch(source, /\bsetInterval\s*\(/);
assert.doesNotMatch(source, /\bsetTimeout\s*\(/);
assert.doesNotMatch(source, /\brouter\.(?:post|put|patch|delete)\s*\(/);

console.log(
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1_PROOF_GREEN",
);
console.log("cases=7");
console.log("runtime_route_mount=false");
console.log("caller_lease_authority=false");
console.log("caller_worker_id_authority=false");
console.log("server_enqueue_required=true");
console.log("server_claim_required=true");
console.log("claim_factory_closed_before_child=true");
console.log("fresh_child_factory_revalidation_required=true");
console.log("lease_capability_returned=false");
console.log("automatic_retry=false");
console.log("network_connection_performed=false");
console.log("transaction_broadcast=false");
console.log("funds_action=false");
console.log(
  "marker=" +
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1,
);
