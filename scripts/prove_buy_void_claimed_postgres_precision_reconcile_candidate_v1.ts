#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
  verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.js";

const ROOT = process.cwd();
const EXPECTED_MAIN =
  "fcf9665faa8e841fb55339fbd4b6bf4faf9f69b9";

const CANDIDATE = path.join(
  ROOT,
  "ops/mainnet0/buy-void-claimed-postgres-precision-reconcile-candidate-v1.json",
);
const BASE = path.join(
  ROOT,
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json",
);
const CREDENTIALS_92 = path.join(
  ROOT,
  "ops/systemd/void-node-live.service.d/92-buy-void-dispatcher-postgres-credentials-v1.conf.example",
);
const RECONCILE_94 = path.join(
  ROOT,
  "ops/systemd/void-node-live.service.d/94-buy-void-claimed-postgres-precision-reconcile-v1.conf.example",
);

function readJson(file: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function activeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function envMap(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of activeLines(text)) {
    if (!line.startsWith("Environment=")) continue;
    const payload = line.slice("Environment=".length);
    const index = payload.indexOf("=");
    assert.notEqual(index, -1);
    const key = payload.slice(0, index);
    const value = payload.slice(index + 1);
    assert.equal(out.has(key), false, "duplicate environment key " + key);
    out.set(key, value);
  }
  return out;
}

const candidate = readJson(CANDIDATE);
const base = readJson(BASE);
const text92 = fs.readFileSync(CREDENTIALS_92, "utf8");
const text94 = fs.readFileSync(RECONCILE_94, "utf8");
const env94 = envMap(text94);

assert.equal(
  candidate.marker,
  "VOID_BUY_VOID_CLAIMED_POSTGRES_PRECISION_RECONCILE_CANDIDATE_V1",
);
assert.equal(candidate.version, 1);
assert.equal(candidate.source_main_commit, EXPECTED_MAIN);
assert.equal(
  candidate.status,
  "source_only_preserve_existing_nonmoney_runtime_pending_host_apply",
);

assert.deepEqual(candidate.observed_safe_baseline, {
  VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED: "1",
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED: "1",
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED: "0",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED:
    "unset",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED:
    "unset",
});

assert.deepEqual(candidate.target_preserved_runtime, {
  VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED: "1",
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED: "1",
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED: "0",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED: "0",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED:
    "0",
});

const expectedOverlay = {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED: "0",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED:
    "0",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST: "127.0.0.1",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT: "5432",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX: "4",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS: "5000",
};
assert.deepEqual(candidate.postgres_overlay, {
  VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST: "127.0.0.1",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT: "5432",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX: "4",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS: "5000",
});
assert.deepEqual(Object.fromEntries(env94), expectedOverlay);

for (const preservedKey of [
  "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
]) {
  assert.equal(
    env94.has(preservedKey),
    false,
    "reconcile overlay must not override " + preservedKey,
  );
}

assert.equal(
  base.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED,
  "0",
);
assert.equal(
  base.candidate_configuration
    .VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED,
  "0",
);

assert.deepEqual(candidate.fixed_postgres_identity, {
  database: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
  user: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
  application_name:
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
  schema_contract:
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1,
  ssl_mode: "verify-full",
  tls_server_name: "localhost",
  password_credential_id:
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  ca_credential_id:
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
});

assert.deepEqual(candidate.host_observations_required_before_apply, {
  clean_main_worktree: true,
  source_alignment_to_current_main: true,
  postgresql_16_present: true,
  postgresql_loopback_5432_accepting: true,
  service_apply_gate_zero: true,
  credential_bindings_absent_or_exact: true,
});

assert.deepEqual(candidate.authority, {
  preserves_parent_runtime_enabled: true,
  preserves_full_runtime_enabled: true,
  preserves_full_runtime_apply_disabled: true,
  claimed_runtime_enabled: false,
  admitted_guarded_runtime_enabled: false,
  service_mutation: false,
  database_mutation: false,
  credential_content_read: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  funds_action: false,
  automatic_retry: false,
});

const active92 = activeLines(text92);
assert.deepEqual(active92, [
  "[Service]",
  "LoadCredential=" +
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1 +
    ":/ABSOLUTE/OPERATOR/PRIVATE/PATH/" +
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  "LoadCredential=" +
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1 +
    ":/ABSOLUTE/OPERATOR/PRIVATE/PATH/" +
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1 +
    ".pem",
]);

const credentialsDirectory =
  String(base.candidate_configuration.CREDENTIALS_DIRECTORY || "");
assert.match(credentialsDirectory, /^\/run\/credentials\/.+/);

const verified =
  verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1({
    VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST:
      env94.get("VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST"),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT:
      env94.get("VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT"),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_DATABASE:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_USER:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_APPLICATION_NAME:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_SCHEMA_CONTRACT:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_SSL_MODE: "verify-full",
    VOID_BUY_VOID_DISPATCHER_POSTGRES_TLS_SERVER_NAME: "localhost",
    VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX:
      env94.get("VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX"),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS:
      env94.get("VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS"),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS:
      env94.get("VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS"),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
    CREDENTIALS_DIRECTORY: credentialsDirectory,
  });
assert.equal(verified.ok, true);
assert.equal(verified.status, "candidate_verified");
assert.equal(verified.production_connection_performed, false);
assert.equal(verified.credential_read_performed, false);

for (const forbidden of [
  "Environment=VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=",
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=",
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=",
  "Environment=CREDENTIALS_DIRECTORY=",
  "Environment=PGPASSWORD=",
  "Environment=DATABASE_URL=",
  "LoadCredential=",
  "SetCredential=",
  "ImportCredential=",
  "ExecStart=",
  "ExecStartPre=",
  "ExecStartPost=",
]) {
  assert.equal(
    activeLines(text94).some((line) => line.startsWith(forbidden)),
    false,
    "reconcile overlay forbidden active directive: " + forbidden,
  );
}

console.log(
  "VOID_BUY_VOID_CLAIMED_POSTGRES_PRECISION_RECONCILE_CANDIDATE_V1_PROOF_GREEN",
);
console.log("preserve_parent_runtime_enabled=true");
console.log("preserve_full_runtime_enabled=true");
console.log("full_runtime_apply_enabled=false");
console.log("claimed_runtime_enabled=false");
console.log("admitted_guarded_runtime_enabled=false");
console.log("postgres_config_candidate_verified=true");
console.log("postgres_host=127.0.0.1");
console.log("postgres_port=5432");
console.log("postgres_loadcredential_bindings=2");
console.log("reconcile_overlay_loadcredential_mutation=false");
console.log("reconcile_overlay_service_execution_override=false");
console.log("database_connection=false");
console.log("database_mutation=false");
console.log("credential_content_read=false");
console.log("transaction_broadcast=false");
console.log("funds_action=false");
