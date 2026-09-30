#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_AUTHORITY_V1,
  VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1,
  VOID_BUY_VOID_PRECISION_POSTGRES_SOURCE_SLICE_BLOBS_V1,
  requireDormantPostgresHostStateV1,
} from "../tools/void-precision-buy-void-postgres-host-qualification-v1.mjs";

const wrapper = fs.readFileSync(
  "ops/precision/void_precision_buy_void_postgres_host_qualification_v1.sh",
  "utf8",
);
const tool = fs.readFileSync(
  "tools/void-precision-buy-void-postgres-host-qualification-v1.mjs",
  "utf8",
);
const workflow = fs.readFileSync(
  ".github/workflows/buy-void-precision-postgres-host-qualification-v1.yml",
  "utf8",
);

assert.equal(
  VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1,
  "VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1",
);
assert.deepEqual(
  VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_AUTHORITY_V1,
  {
    designated_host_read_only_qualification: true,
    live_repo_source_slice_read: true,
    service_environment_read: true,
    systemd_credential_metadata_read: true,
    credential_content_read_inside_reviewed_factory: true,
    credential_content_output: false,
    loopback_postgres_tls_connect: true,
    schema_catalog_query: true,
    repeatable_read_read_only_transaction: true,
    database_mutation: false,
    schema_mutation: false,
    runtime_gate_mutation: false,
    service_mutation: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    token_or_work_credit_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  },
);

const expectedBlobs = {
  "ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example":
    "a3500a7f1813972b90e5c00dbf8a03ed4b4ddd6b",
  "ops/systemd/void-node-live.service.d/92-buy-void-dispatcher-postgres-credentials-v1.conf.example":
    "dfe25fac6dfd98bc884ade38fe5196e6c048f60b",
  "ops/systemd/void-node-live.service.d/94-buy-void-claimed-postgres-precision-reconcile-v1.conf.example":
    "67981a141ebfc8a05902fdefc21a8db58946329c",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.ts":
    "7133a3a7ebb9349d195cc090787a134f07616a3e",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts":
    "066b5d3fde11ec79a8c6bb45f2ec5d6fec511e1f",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.ts":
    "88c72330c5a5b92780f2c6add7dda7dd5e92af10",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.ts":
    "aae34461ac47b3c5cbdecf75e6f6aa5935df677e",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.ts":
    "2db30a0d7f343c5c1264d89ec5c752ade609d843",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts":
    "f74cafa7665be4ac0ea4fd518ec02440d337fa27",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts":
    "1c238ae8dff7e088421eabff93a98d97357d99e7",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_v1.ts":
    "27045345cf48cacd2a5f2bc9330812579d0761a4",
  "package.json":
    "f28c3e9446c7623ef203da36a9642d046e5f34ee",
  "package-lock.json":
    "b2671f0149f522b2489247016df0a5ec4bb72b8b",
};
assert.deepEqual(
  VOID_BUY_VOID_PRECISION_POSTGRES_SOURCE_SLICE_BLOBS_V1,
  expectedBlobs,
);
for (const [path, blob] of Object.entries(expectedBlobs)) {
  assert(wrapper.includes(`["${path}"]="${blob}"`), path);
}

const goodEnv = {
  VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED: "1",
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED: "0",
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED: "0",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED: "0",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED:
    "0",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST: "127.0.0.1",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT: "5432",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX: "4",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS: "5000",
  CREDENTIALS_DIRECTORY:
    "/run/user/1000/credentials/void-node-live.service",
};
const state = requireDormantPostgresHostStateV1(goodEnv);
assert.equal(state.full_runtime, "0");
assert.equal(state.full_runtime_apply, "0");
assert.equal(state.claimed_runtime, "0");
assert.equal(state.admitted_guarded_runtime, "0");

for (const [key, bad] of [
  ["VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED", "0"],
  ["VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED", "1"],
  ["VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED", "1"],
  ["VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED", "1"],
  ["VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED", "1"],
  ["VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST", "::1"],
  ["VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT", "6432"],
  ["VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX", "16"],
]) {
  assert.throws(
    () => requireDormantPostgresHostStateV1({ ...goodEnv, [key]: bad }),
    /host_environment_mismatch/u,
    key,
  );
}
assert.throws(
  () =>
    requireDormantPostgresHostStateV1({
      ...goodEnv,
      CREDENTIALS_DIRECTORY: "relative/credentials",
    }),
  /credentials_directory_invalid/u,
);

for (const forbidden of [
  "systemctl --user restart",
  "systemctl --user stop",
  "systemctl --user start",
  "systemctl --user reload",
  "systemctl --user daemon-reload",
  "git fetch",
  "git pull",
  "git merge",
  "git switch",
  "git checkout",
  "psql ",
  "sudo ",
  "pg_ctl",
  "createdb",
  "createuser",
]) {
  assert.equal(wrapper.includes(forbidden), false, forbidden);
}
for (const required of [
  "source_slice_blob_identity_green=true",
  "installed_dropin_contract_green=true",
  "credential_metadata_green=true",
  "dormant_runtime_gate_green=true",
  "credential_content_read_inside_reviewed_factory=true",
  "ambient_libpq_environment_forwarded=false",
  "env -i",
]) {
  assert(wrapper.includes(required), required);
}
for (const forbidden of [
  "runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1",
  "runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1",
  "applyBuyVoidPaymentKeyedDispatcherGuardedBroadcastV1",
  "runBuyVoidPaymentKeyedFullRuntimeV1",
]) {
  assert.equal(tool.includes(forbidden), false, forbidden);
}
for (const required of [
  "createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1",
  "admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1",
  "credential_content_output=false",
  "database_mutation_performed=false",
  "worker_invoked=false",
  "transaction_broadcast_performed=false",
  "funds_movement_performed=false",
]) {
  assert(tool.includes(required), required);
}

const dependencies = [
  ".github/workflows/buy-void-precision-postgres-host-qualification-v1.yml",
  "docs/operators/buy-void-precision-postgres-host-qualification-v1.md",
  "ops/precision/void_precision_buy_void_postgres_host_qualification_v1.sh",
  "scripts/prove_buy_void_precision_postgres_host_qualification_v1.mjs",
  "tools/void-precision-buy-void-postgres-host-qualification-v1.mjs",
  ...Object.keys(expectedBlobs),
];

const prStart = workflow.indexOf("  pull_request:\n");
const pushStart = workflow.indexOf("  push:\n");
const permissionsStart = workflow.indexOf("\npermissions:\n");
assert(prStart >= 0 && pushStart > prStart && permissionsStart > pushStart);
const prBlock = workflow.slice(prStart, pushStart);
const pushBlock = workflow.slice(pushStart, permissionsStart);
for (const dependency of dependencies) {
  const token = `- "${dependency}"`;
  assert.equal(
    prBlock.split(token).length - 1,
    1,
    `PR trigger mismatch: ${dependency}`,
  );
  assert.equal(
    pushBlock.split(token).length - 1,
    1,
    `push trigger mismatch: ${dependency}`,
  );
}
assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/u);
assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/u);
assert.doesNotMatch(
  workflow,
  /uses: actions\/(?:checkout|setup-node)@v[0-9]/u,
);
assert.match(workflow, /persist-credentials:\s*false/u);

console.log(
  "VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1_PROOF_GREEN",
);
console.log("dormant_gate_fail_closed_green=true");
console.log("source_slice_blob_binding_green=true");
console.log("host_wrapper_no_mutation_contract_green=true");
console.log("production_factory_only_green=true");
console.log("schema_admission_only_green=true");
console.log("focused_trigger_dependency_closure_green=true");
console.log("credential_content_output=false");
console.log("database_mutation=false");
console.log("runtime_gate_mutation=false");
console.log("worker_invoked=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
