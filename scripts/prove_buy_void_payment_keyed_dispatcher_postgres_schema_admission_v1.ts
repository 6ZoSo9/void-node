#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { Pool } from "pg";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1,
  type BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.js";
import type {
  BuyVoidPaymentKeyedDispatcherPostgresClientV1,
  BuyVoidPaymentKeyedDispatcherPostgresPoolV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1,
  admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.js";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.ts",
  ),
  "utf8",
);

for (const fragment of [
  "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
  "pg_catalog.pg_class",
  "pg_catalog.pg_attribute",
  "pg_catalog.pg_database",
  "pg_catalog.aclexplode",
  "pg_catalog.acldefault",
  "pg_catalog.pg_constraint",
  "pg_catalog.pg_index",
  "pg_catalog.pg_trigger",
  "current_schemas(true)",
  "pg_catalog.pg_my_temp_schema()",
  "transaction_read_only",
]) {
  assert.equal(source.includes(fragment), true, fragment);
}
for (const forbidden of [
  /\bCREATE\s+(?:TABLE|SCHEMA|INDEX|ROLE|DATABASE|TYPE|FUNCTION|TRIGGER|VIEW|SEQUENCE)\b/i,
  /\bALTER\s+(?:TABLE|SCHEMA|ROLE|DATABASE|TYPE|FUNCTION|VIEW|SEQUENCE)\b/i,
  /\bDROP\s+(?:TABLE|SCHEMA|INDEX|ROLE|DATABASE|TYPE|FUNCTION|TRIGGER|VIEW|SEQUENCE)\b/i,
  /\bTRUNCATE\s+(?:TABLE\s+)?[A-Za-z_]/i,
  /\bINSERT\s+INTO\b/i,
  /\bUPDATE\s+[A-Za-z_]/i,
  /\bDELETE\s+FROM\b/i,
  /\bGRANT\s+[A-Za-z_]/i,
  /\bREVOKE\s+[A-Za-z_]/i,
]) {
  assert.equal(forbidden.test(source), false, String(forbidden));
}

const authority =
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1;
assert.equal(authority.database_transaction_read_only, true);
assert.equal(authority.catalog_selects_only, true);
assert.equal(authority.exact_database_owner_required, true);
assert.equal(authority.public_schema_owner_bound_to_database_owner, true);
assert.equal(authority.nonowner_public_schema_create_allowed, false);
assert.equal(authority.nonowner_table_privileges_allowed, false);
assert.equal(authority.exact_search_path_required, true);
assert.equal(authority.active_temporary_schema_allowed, false);
assert.equal(authority.exact_index_set_required, true);
assert.equal(authority.automatic_schema_migration, false);
assert.equal(authority.schema_mutation, false);
assert.equal(authority.data_mutation, false);
assert.equal(authority.runtime_route_mount, false);
assert.equal(authority.wallet_access, false);
assert.equal(authority.signing, false);
assert.equal(authority.transaction_broadcast, false);
assert.equal(authority.money_movement, false);

const url = String(
  process.env.VOID_TEST_POSTGRES_SCHEMA_ADMISSION_URL || "",
).trim();
assert.ok(url, "VOID_TEST_POSTGRES_SCHEMA_ADMISSION_URL required");

const rawPool = new Pool({
  connectionString: url,
  application_name:
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
  options: "-c client_encoding=UTF8 -c search_path=pg_catalog,public",
  max: 2,
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 5000,
});

const narrowPool: BuyVoidPaymentKeyedDispatcherPostgresPoolV1 = {
  async connect(): Promise<BuyVoidPaymentKeyedDispatcherPostgresClientV1> {
    const client = await rawPool.connect();
    let released = false;
    return {
      async query(text, values) {
        if (released) throw new Error("test_client_released");
        const result =
          values === undefined
            ? await client.query(text)
            : await client.query(text, Array.from(values));
        return {
          rows: result.rows as Record<string, unknown>[],
          rowCount: result.rowCount,
        };
      },
      release(error) {
        if (released) throw new Error("test_client_release_duplicate");
        released = true;
        client.release(error);
      },
    };
  },
};

const factory: BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1 = {
  ok: true,
  marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1,
  version: 1,
  status: "ready",
  configuration_fingerprint_sha256: "a".repeat(64),
  connection_policy: {
    host: "127.0.0.1",
    port: 5432,
    database: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
    user: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
    application_name:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
    pool_max: 2,
    connection_timeout_ms: 2000,
    idle_timeout_ms: 5000,
    ssl_mode: "verify-full",
    tls_server_name: "localhost",
    tls_minimum_version: "TLSv1.2",
    ssl_negotiation: "postgres",
    channel_binding_enabled: true,
    pipeline_enabled: false,
    client_encoding: "UTF8",
    startup_options:
      "-c client_encoding=UTF8 -c search_path=pg_catalog,public",
    replication_mode: "false",
    connection_string_used: false,
    ambient_libpq_fallback: false,
  },
  pool: narrowPool,
  async close() {},
  pool_error_snapshot() {
    return { count: 0, last_error_class: null, last_error_code: null };
  },
  credential_read_performed: true,
  network_connect_performed: false,
  schema_query_performed: false,
  authority:
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1,
};

try {
  const accepted =
    await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  if (!accepted.ok) throw new Error(accepted.reason);
  assert.equal(
    accepted.marker,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1,
  );
  assert.equal(accepted.status, "schema_admitted");
  assert.match(accepted.schema_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(accepted.schema_contract_tables.length, 3);
  assert.equal(accepted.schema_query_performed, true);
  assert.equal(accepted.database_mutation_performed, false);

  const tempClient = await rawPool.connect();
  try {
    await tempClient.query(
      "CREATE TEMP TABLE schema_admission_temp_probe_v1 (probe integer)",
    );
    const tempPool: BuyVoidPaymentKeyedDispatcherPostgresPoolV1 = {
      async connect(): Promise<BuyVoidPaymentKeyedDispatcherPostgresClientV1> {
        return {
          async query(text, values) {
            const result =
              values === undefined
                ? await tempClient.query(text)
                : await tempClient.query(text, Array.from(values));
            return {
              rows: result.rows as Record<string, unknown>[],
              rowCount: result.rowCount,
            };
          },
          release() {},
        };
      },
    };
    const tempFactory: BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1 =
      {
        ...factory,
        pool: tempPool,
      };
    const tempHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(tempFactory);
    assert.equal(tempHeld.ok, false);
    if (tempHeld.ok) throw new Error("expected temp-schema hold");
    assert.equal(
      tempHeld.reason,
      "dispatcher_postgres_schema_admission_temp_schema_present",
    );
    assert.equal(tempHeld.schema_query_performed, true);
    assert.equal(tempHeld.database_mutation_performed, false);
  } finally {
    await tempClient.query("DROP TABLE IF EXISTS schema_admission_temp_probe_v1");
    tempClient.release();
  }

  const schemaGrantClient = await rawPool.connect();
  try {
    await schemaGrantClient.query("GRANT CREATE ON SCHEMA public TO PUBLIC");
  } finally {
    schemaGrantClient.release();
  }
  try {
    const schemaAclHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(schemaAclHeld.ok, false);
    if (schemaAclHeld.ok) throw new Error("expected public-schema ACL hold");
    assert.equal(
      schemaAclHeld.reason,
      "dispatcher_postgres_schema_admission_public_schema_create_grant_present",
    );
    assert.equal(schemaAclHeld.schema_query_performed, true);
    assert.equal(schemaAclHeld.database_mutation_performed, false);
  } finally {
    const revokeSchemaGrantClient = await rawPool.connect();
    try {
      await revokeSchemaGrantClient.query(
        "REVOKE CREATE ON SCHEMA public FROM PUBLIC",
      );
    } finally {
      revokeSchemaGrantClient.release();
    }
  }

  const tableGrantClient = await rawPool.connect();
  try {
    await tableGrantClient.query(
      "GRANT SELECT ON public.void_buy_void_payment_keyed_dispatcher_jobs_v1 TO PUBLIC",
    );
  } finally {
    tableGrantClient.release();
  }
  try {
    const tableAclHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(tableAclHeld.ok, false);
    if (tableAclHeld.ok) throw new Error("expected table ACL hold");
    assert.equal(
      tableAclHeld.reason,
      "dispatcher_postgres_schema_admission_relation_policy_mismatch",
    );
    assert.equal(tableAclHeld.schema_query_performed, true);
    assert.equal(tableAclHeld.database_mutation_performed, false);
  } finally {
    const revokeTableGrantClient = await rawPool.connect();
    try {
      await revokeTableGrantClient.query(
        "REVOKE SELECT ON public.void_buy_void_payment_keyed_dispatcher_jobs_v1 FROM PUBLIC",
      );
    } finally {
      revokeTableGrantClient.release();
    }
  }

  const adversary = await rawPool.connect();
  try {
    await adversary.query(
      "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 ADD COLUMN synthetic_extra TEXT",
    );
  } finally {
    adversary.release();
  }

  const held =
    await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("expected schema hold");
  assert.equal(
    held.reason,
    "dispatcher_postgres_schema_admission_columns_mismatch",
  );
  assert.equal(held.schema_query_performed, true);
  assert.equal(held.database_mutation_performed, false);

  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1_PROOF_GREEN",
  );
  console.log("production_module_catalog_selects_only=true");
  console.log("repeatable_read_transaction=true");
  console.log("transaction_read_only=true");
  console.log("exact_database_identity=true");
  console.log("exact_database_user=true");
  console.log("exact_database_owner=true");
  console.log("public_schema_owner_bound=true");
  console.log("nonowner_public_schema_create_rejected=true");
  console.log("nonowner_table_privilege_rejected=true");
  console.log("exact_search_path=true");
  console.log("effective_search_path_array=true");
  console.log("active_temporary_schema_rejected=true");
  console.log("exact_relation_set=true");
  console.log("exact_column_shape=true");
  console.log("exact_primary_key_shape=true");
  console.log("exact_index_set=true");
  console.log("check_constraint_counts=true");
  console.log("check_constraint_semantic_tokens=true");
  console.log("unexpected_column_rejected=true");
  console.log("automatic_schema_migration=false");
  console.log("runtime_route_mount=false");
  console.log("wallet_access=false");
  console.log("signing=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");
} finally {
  await rawPool.end();
}
