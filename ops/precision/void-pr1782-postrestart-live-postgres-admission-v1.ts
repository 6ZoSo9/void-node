#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1,
} from "../../src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.js";
import {
  admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1,
} from "../../src/economic/buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
} from "../../src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.js";

console.log("VOID_PR1782_POSTRESTART_LIVE_POSTGRES_ADMISSION_V1");
console.log("credential_read=true");
console.log("live_postgres_connection=true");
console.log("schema_query_performed=true");
console.log("database_mutation=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("inventory_or_wc_mutation=false");
console.log("funds_movement=false");

assert.equal(process.platform, "linux");
assert.equal(typeof process.getuid, "function");
const uid = process.getuid!();
const credentialsDirectory = String(process.env.CREDENTIALS_DIRECTORY || "");
assert.equal(
  credentialsDirectory,
  `/run/user/${uid}/credentials/void-node-live.service`,
);

const candidate = {
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
  CREDENTIALS_DIRECTORY: credentialsDirectory,
};

Object.assign(process.env, {
  PGHOST: "203.0.113.99",
  PGPORT: "1",
  PGDATABASE: "attacker",
  PGUSER: "attacker",
  PGPASSWORD: "attacker",
  PGAPPNAME: "attacker",
  PGSSLMODE: "disable",
  PGOPTIONS: "-c search_path=attacker",
  DATABASE_URL: "postgresql://attacker:attacker@203.0.113.99:1/attacker",
});

const factory =
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(candidate);
if (!factory.ok) {
  throw new Error(
    "postrestart_factory_held:" +
      factory.reason +
      ":" +
      String(factory.detail?.configuration_reason || ""),
  );
}

assert.equal(factory.status, "ready");
assert.equal(factory.credential_read_performed, true);
assert.equal(factory.network_connect_performed, false);
assert.equal(factory.schema_query_performed, false);
assert.equal(factory.connection_policy.host, "127.0.0.1");
assert.equal(factory.connection_policy.port, 5432);
assert.equal(
  factory.connection_policy.database,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
);
assert.equal(
  factory.connection_policy.user,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
);
assert.equal(
  factory.connection_policy.application_name,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
);
assert.equal(factory.connection_policy.ssl_mode, "verify-full");
assert.equal(factory.connection_policy.tls_server_name, "localhost");
assert.equal(factory.connection_policy.ambient_libpq_fallback, false);

try {
  const admission =
    await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
  if (!admission.ok) {
    throw new Error(
      "postrestart_schema_admission_held:" +
        admission.reason +
        ":" +
        JSON.stringify(admission.detail || {}),
    );
  }
  assert.equal(admission.status, "schema_admitted");
  assert.equal(admission.schema_query_performed, true);
  assert.equal(admission.database_mutation_performed, false);
  assert.match(admission.configuration_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(admission.schema_fingerprint_sha256, /^[0-9a-f]{64}$/);

  console.log("credentials_directory_live_service=true");
  console.log("credential_current_uid_bound=true");
  console.log("factory_ready=true");
  console.log("factory_lazy_before_admission=true");
  console.log("ambient_pg_environment_ignored=true");
  console.log("tls_verify_full=true");
  console.log("schema_admitted=true");
  console.log(
    "configuration_fingerprint_sha256=" +
      admission.configuration_fingerprint_sha256,
  );
  console.log(
    "schema_fingerprint_sha256=" +
      admission.schema_fingerprint_sha256,
  );
  console.log("database_mutation=false");
  console.log("wallet_or_signer_access=false");
  console.log("transaction_broadcast=false");
  console.log("funds_movement=false");
  console.log("result=GREEN");
} finally {
  await factory.close();
}
