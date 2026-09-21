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
const MAIN_AT_CREATION =
  "c936ccbc56bafbcdbcc75b1b94a5ff65be7a3197";

const BASE_CANDIDATE = path.join(
  ROOT,
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json",
);
const OVERLAY_CANDIDATE = path.join(
  ROOT,
  "ops/mainnet0/buy-void-claimed-postgres-dormant-host-candidate-v1.json",
);
const POLICY_91 = path.join(
  ROOT,
  "ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example",
);
const CREDENTIALS_92 = path.join(
  ROOT,
  "ops/systemd/void-node-live.service.d/92-buy-void-dispatcher-postgres-credentials-v1.conf.example",
);
const OVERLAY_93 = path.join(
  ROOT,
  "ops/systemd/void-node-live.service.d/93-buy-void-claimed-postgres-dormant-v1.conf.example",
);

type JsonObject = Record<string, any>;

function readJson(file: string): JsonObject {
  return JSON.parse(fs.readFileSync(file, "utf8")) as JsonObject;
}

function activeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function environmentMap(text: string): Map<string, string> {
  const env = new Map<string, string>();
  for (const line of activeLines(text)) {
    if (!line.startsWith("Environment=")) continue;
    const payload = line.slice("Environment=".length);
    const index = payload.indexOf("=");
    assert.notEqual(index, -1, "environment assignment missing =");
    const key = payload.slice(0, index);
    const value = payload.slice(index + 1);
    assert.ok(key.length > 0);
    assert.equal(env.has(key), false, "duplicate environment key: " + key);
    env.set(key, value);
  }
  return env;
}

function loadCredentialMap(text: string): Map<string, string> {
  const loads = new Map<string, string>();
  for (const line of activeLines(text)) {
    if (!line.startsWith("LoadCredential=")) continue;
    const payload = line.slice("LoadCredential=".length);
    const index = payload.indexOf(":");
    assert.notEqual(index, -1, "LoadCredential missing source separator");
    const id = payload.slice(0, index);
    const source = payload.slice(index + 1);
    assert.ok(id.length > 0);
    assert.ok(source.length > 0);
    assert.equal(loads.has(id), false, "duplicate LoadCredential id: " + id);
    loads.set(id, source);
  }
  return loads;
}

const baseCandidate = readJson(BASE_CANDIDATE);
const overlay = readJson(OVERLAY_CANDIDATE);
const text91 = fs.readFileSync(POLICY_91, "utf8");
const text92 = fs.readFileSync(CREDENTIALS_92, "utf8");
const text93 = fs.readFileSync(OVERLAY_93, "utf8");
const env91 = environmentMap(text91);
const env93 = environmentMap(text93);
const loads92 = loadCredentialMap(text92);

assert.equal(
  overlay.marker,
  "VOID_BUY_VOID_CLAIMED_POSTGRES_DORMANT_HOST_CANDIDATE_V1",
);
assert.equal(overlay.version, 1);
assert.equal(
  overlay.status,
  "source_candidate_pending_designated_host_qualification",
);
assert.equal(overlay.source_main_commit, MAIN_AT_CREATION);
assert.equal(
  overlay.base_payment_keyed_candidate,
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json",
);
assert.equal(
  overlay.base_dormant_systemd_policy,
  "ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example",
);
assert.equal(
  overlay.postgres_credential_binding,
  "ops/systemd/void-node-live.service.d/92-buy-void-dispatcher-postgres-credentials-v1.conf.example",
);
assert.equal(
  overlay.dormant_postgres_overlay,
  "ops/systemd/void-node-live.service.d/93-buy-void-claimed-postgres-dormant-v1.conf.example",
);

const expectedOverlayConfiguration = {
  VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED: "0",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED:
    "0",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED:
    "0",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST: "127.0.0.1",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT: "5432",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX: "4",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS: "5000",
};
assert.deepEqual(
  overlay.candidate_configuration,
  expectedOverlayConfiguration,
);
assert.deepEqual(
  Object.fromEntries(env93),
  expectedOverlayConfiguration,
);

assert.deepEqual(overlay.fixed_postgres_identity, {
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

assert.deepEqual(overlay.authority, {
  parent_runtime_enabled: false,
  claimed_runtime_enabled: false,
  admitted_guarded_runtime_enabled: false,
  full_runtime_enabled: false,
  full_runtime_apply_enabled: false,
  service_mutation: false,
  credential_content_read: false,
  database_connection: false,
  database_provisioning: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  funds_action: false,
  automatic_retry: false,
});

assert.deepEqual(overlay.remaining_host_gates, [
  "designated_host_source_alignment",
  "postgresql_16_local_service_readiness",
  "postgresql_tls_server_configuration",
  "dispatcher_database_role_schema_acl_provisioning",
  "postgres_password_credential_source_binding",
  "postgres_ca_credential_source_binding",
  "systemd_composed_environment_exactness",
  "disabled_runtime_observation",
]);

assert.equal(
  baseCandidate.candidate_configuration
    .VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED,
  "0",
);
assert.equal(
  baseCandidate.candidate_configuration
    .VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED,
  "0",
);
assert.equal(
  env91.get("VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED"),
  "0",
);
assert.equal(
  env91.get("VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED"),
  "0",
);

for (const key of env93.keys()) {
  assert.equal(
    env91.has(key),
    false,
    "91/93 environment overlap forbidden: " + key,
  );
}

assert.deepEqual(activeLines(text92), [
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
assert.equal(loads92.size, 2);
assert.equal(
  loads92.has(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  ),
  true,
);
assert.equal(
  loads92.has(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  ),
  true,
);

const combined = new Map([...env91, ...env93]);
for (const key of [
  "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
]) {
  assert.equal(combined.get(key), "0", key + " must remain dormant");
}

const credentialsDirectory =
  String(
    baseCandidate.candidate_configuration.CREDENTIALS_DIRECTORY || "",
  );
assert.match(
  credentialsDirectory,
  /^\/run\/credentials\/.+/,
);

const postgresDecision =
  verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1({
    VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST:
      env93.get("VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST"),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT:
      env93.get("VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT"),
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
      env93.get("VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX"),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS:
      env93.get("VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS"),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS:
      env93.get("VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS"),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
    CREDENTIALS_DIRECTORY: credentialsDirectory,
  });
if (postgresDecision.ok !== true) {
  throw new Error(
    "dormant_postgres_candidate_not_verified:" + postgresDecision.reason,
  );
}
assert.equal(postgresDecision.ok, true);
assert.equal(postgresDecision.status, "candidate_verified");
assert.equal(postgresDecision.host, "127.0.0.1");
assert.equal(postgresDecision.port, 5432);
assert.equal(postgresDecision.pool_max, 4);
assert.equal(postgresDecision.connection_timeout_ms, 5000);
assert.equal(postgresDecision.idle_timeout_ms, 5000);
assert.equal(postgresDecision.production_connection_performed, false);
assert.equal(postgresDecision.credential_read_performed, false);
assert.match(
  postgresDecision.configuration_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);

for (const text of [text91, text92, text93]) {
  for (const forbidden of [
    "Environment=PGPASSWORD",
    "Environment=DATABASE_URL",
    "Environment=CREDENTIALS_DIRECTORY",
    "SetCredential=",
    "ImportCredential=",
    "ExecStart=",
    "ExecStartPre=",
    "ExecStartPost=",
  ]) {
    assert.equal(
      text.includes(forbidden),
      false,
      "forbidden host candidate directive: " + forbidden,
    );
  }
}

assert.equal(/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text93), false);
assert.equal(/postgres(?:ql)?:\/\//i.test(text93), false);

console.log(
  "VOID_BUY_VOID_CLAIMED_POSTGRES_DORMANT_HOST_CANDIDATE_V1_PROOF_GREEN",
);
console.log("base_payment_keyed_runtime_enabled=false");
console.log("base_payment_keyed_apply_enabled=false");
console.log("parent_runtime_enabled=false");
console.log("claimed_runtime_enabled=false");
console.log("admitted_guarded_runtime_enabled=false");
console.log("postgres_host=127.0.0.1");
console.log("postgres_port=5432");
console.log("postgres_pool_max=4");
console.log("postgres_connection_timeout_ms=5000");
console.log("postgres_idle_timeout_ms=5000");
console.log("postgres_config_candidate_verified=true");
console.log("postgres_loadcredential_bindings=2");
console.log("credentials_directory_systemd_derived=true");
console.log("service_mutation=false");
console.log("credential_content_read=false");
console.log("database_connection=false");
console.log("database_provisioning=false");
console.log("transaction_broadcast=false");
console.log("funds_action=false");
