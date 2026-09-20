#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
  verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.js";

const base = () => ({
  VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST: "127.0.0.1",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT: "5432",
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
  VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX: "4",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS: "5000",
  VOID_BUY_VOID_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID:
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID:
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  CREDENTIALS_DIRECTORY: "/run/credentials/void-node",
});

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1,
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1",
);

const authority =
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_AUTHORITY_V1;
assert.equal(authority.pure_configuration_validation_only, true);
assert.equal(authority.process_environment_read, false);
assert.equal(authority.filesystem_read, false);
assert.equal(authority.credential_read, false);
assert.equal(authority.network_connect, false);
assert.equal(authority.database_query, false);
assert.equal(authority.schema_mutation, false);
assert.equal(authority.package_pg_dependency_added, false);
assert.equal(authority.production_connection_factory_present, false);
assert.equal(authority.loopback_transport_only, true);
assert.equal(authority.tls_required, true);
assert.equal(authority.tls_certificate_verification_required, true);
assert.equal(authority.automatic_schema_migration, false);

const ready = verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1(base());
if (ready.ok === false) throw new Error(ready.reason);
assert.equal(ready.ok, true);
assert.equal(ready.status, "candidate_verified");
assert.equal(ready.host, "127.0.0.1");
assert.equal(ready.port, 5432);
assert.equal(ready.pool_max, 4);
assert.equal(ready.connection_timeout_ms, 5000);
assert.equal(ready.idle_timeout_ms, 5000);
assert.equal(ready.ssl_mode, "verify-full");
assert.equal(ready.tls_server_name, "localhost");
assert.match(ready.configuration_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.equal(ready.connection_factory_ready, false);
assert.equal(ready.schema_admission_ready, false);
assert.equal(ready.production_connection_performed, false);
assert.equal(ready.credential_read_performed, false);

const ipv6 = verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1({
  ...base(),
  VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST: "::1",
});
assert.equal(ipv6.ok, true);

const cases: Array<[string, Record<string, string>, string]> = [
  [
    "remote_host",
    { ...base(), VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST: "10.0.0.8" },
    "dispatcher_postgres_host_not_loopback",
  ],
  [
    "tls_disable",
    { ...base(), VOID_BUY_VOID_DISPATCHER_POSTGRES_SSL_MODE: "disable" },
    "dispatcher_postgres_tls_verification_required",
  ],
  [
    "tls_require_without_verify",
    { ...base(), VOID_BUY_VOID_DISPATCHER_POSTGRES_SSL_MODE: "require" },
    "dispatcher_postgres_tls_verification_required",
  ],
  [
    "servername_substitution",
    { ...base(), VOID_BUY_VOID_DISPATCHER_POSTGRES_TLS_SERVER_NAME: "db.example.com" },
    "dispatcher_postgres_tls_server_name_mismatch",
  ],
  [
    "password_credential_substitution",
    {
      ...base(),
      VOID_BUY_VOID_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID:
        "other-postgres-password",
    },
    "dispatcher_postgres_password_credential_id_mismatch",
  ],
  [
    "ca_credential_substitution",
    {
      ...base(),
      VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID:
        "other-postgres-ca",
    },
    "dispatcher_postgres_ca_credential_id_mismatch",
  ],
  [
    "pool_zero",
    { ...base(), VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX: "0" },
    "dispatcher_postgres_pool_max_out_of_bounds",
  ],
  [
    "pool_too_large",
    { ...base(), VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX: "17" },
    "dispatcher_postgres_pool_max_out_of_bounds",
  ],
  [
    "connection_timeout_too_large",
    {
      ...base(),
      VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS: "10001",
    },
    "dispatcher_postgres_connection_timeout_ms_out_of_bounds",
  ],
  [
    "idle_timeout_too_small",
    { ...base(), VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS: "999" },
    "dispatcher_postgres_idle_timeout_ms_out_of_bounds",
  ],
  [
    "credential_path_outside_systemd",
    { ...base(), CREDENTIALS_DIRECTORY: "/tmp/credentials" },
    "dispatcher_postgres_credentials_directory_invalid",
  ],
  [
    "credential_root_not_service_directory",
    { ...base(), CREDENTIALS_DIRECTORY: "/run/credentials/" },
    "dispatcher_postgres_credentials_directory_invalid",
  ],
  [
    "leading_zero_port",
    { ...base(), VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT: "05432" },
    "dispatcher_postgres_port_invalid",
  ],
  [
    "leading_zero_pool",
    { ...base(), VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX: "04" },
    "dispatcher_postgres_pool_max_invalid",
  ],
  [
    "database_substitution",
    {
      ...base(),
      VOID_BUY_VOID_DISPATCHER_POSTGRES_DATABASE: "postgres",
    },
    "dispatcher_postgres_database_identity_mismatch",
  ],
  [
    "user_substitution",
    {
      ...base(),
      VOID_BUY_VOID_DISPATCHER_POSTGRES_USER: "postgres",
    },
    "dispatcher_postgres_user_identity_mismatch",
  ],
  [
    "application_substitution",
    {
      ...base(),
      VOID_BUY_VOID_DISPATCHER_POSTGRES_APPLICATION_NAME: "psql",
    },
    "dispatcher_postgres_application_name_mismatch",
  ],
  [
    "schema_substitution",
    {
      ...base(),
      VOID_BUY_VOID_DISPATCHER_POSTGRES_SCHEMA_CONTRACT: "public",
    },
    "dispatcher_postgres_schema_contract_mismatch",
  ],
];

for (const [name, candidate, reason] of cases) {
  const decision =
    verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1(candidate);
  assert.equal(decision.ok, false, name);
  if (decision.ok) throw new Error("expected_hold:" + name);
  assert.equal(decision.reason, reason, name);
  assert.equal(decision.production_connection_performed, false, name);
  assert.equal(decision.credential_read_performed, false, name);
}

const nonEnumerable: any = base();
Object.defineProperty(nonEnumerable, "DATABASE_URL", {
  enumerable: false,
  value: "postgres://secret@example.invalid/db",
});
assert.equal(
  verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1(nonEnumerable).ok,
  false,
);

const symbolKey: any = base();
symbolKey[Symbol("DATABASE_URL")] = "postgres://secret@example.invalid/db";
assert.equal(
  verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1(symbolKey).ok,
  false,
);

const accessor: any = base();
let getterCalls = 0;
Object.defineProperty(accessor, "VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST", {
  enumerable: true,
  get() {
    getterCalls += 1;
    return "127.0.0.1";
  },
});
assert.equal(
  verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1(accessor).ok,
  false,
);
assert.equal(getterCalls, 0);

const unknown: any = base();
unknown.DATABASE_URL = "postgres://secret@example.invalid/db";
const unknownDecision =
  verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1(unknown);
assert.equal(unknownDecision.ok, false);
if (!unknownDecision.ok) {
  assert.equal(
    unknownDecision.reason,
    "dispatcher_postgres_production_config_unknown_key",
  );
  assert.equal(unknownDecision.detail?.key, "DATABASE_URL");
}

const missing: any = base();
delete missing.VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID;
const missingDecision =
  verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1(missing);
assert.equal(missingDecision.ok, false);
if (!missingDecision.ok) {
  assert.equal(
    missingDecision.reason,
    "dispatcher_postgres_production_config_missing_key",
  );
}

console.log(
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1_PROOF_GREEN",
);
console.log("postgres_production_config_cases=" + String(cases.length + 7));
console.log("production_connection_factory_present=false");
console.log("package_pg_dependency_added=false");
console.log("loopback_transport_only=true");
console.log("tls_verify_full_required=true");
console.log("systemd_credential_ids_fixed=true");
console.log("database_url_secret_env_forbidden=true");
console.log("closed_own_data_properties_required=true");
console.log("credential_service_subdirectory_required=true");
console.log("canonical_decimal_configuration_required=true");
console.log("libpq_environment_fallback_forbidden=true");
console.log("schema_admission_ready=false");
console.log("runtime_route_mount=false");
console.log("money_movement=false");
