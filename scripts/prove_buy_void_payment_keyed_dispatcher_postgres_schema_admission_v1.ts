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
assert.equal(authority.partition_membership_allowed, false);
assert.equal(authority.table_inheritance_allowed, false);
assert.equal(authority.exact_index_set_required, true);
assert.equal(authority.primary_index_btree_only, true);
assert.equal(authority.primary_index_include_columns_allowed, false);
assert.equal(authority.validated_constraints_required, true);
assert.equal(authority.deferrable_constraints_allowed, false);
assert.equal(authority.no_inherit_check_constraints_allowed, false);
assert.equal(authority.exact_check_constraint_definitions_required, true);
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

function quoteIdentifier(value: string): string {
  return '"' + value.replace(/"/g, '""') + '"';
}

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

  let originalLastDecisionSeqConstraint = "";
  try {
    const weakenClient = await rawPool.connect();
    try {
      const discovered = await weakenClient.query(
        [
          "SELECT con.conname::text AS constraint_name",
          "FROM pg_catalog.pg_constraint con",
          "JOIN pg_catalog.pg_class c ON c.oid = con.conrelid",
          "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
          "WHERE n.nspname = 'public'",
          "  AND c.relname = 'void_buy_void_payment_keyed_dispatcher_decision_cursors_v1'",
          "  AND con.contype = 'c'",
          "  AND pg_catalog.pg_get_constraintdef(con.oid, false) LIKE '%last_decision_seq%'",
          "ORDER BY con.conname",
        ].join("\n"),
      );
      assert.equal(discovered.rows.length, 1, JSON.stringify(discovered.rows));
      originalLastDecisionSeqConstraint = String(
        discovered.rows[0]?.constraint_name || "",
      );
      assert.ok(originalLastDecisionSeqConstraint);
      await weakenClient.query(
        "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 " +
          "DROP CONSTRAINT " +
          quoteIdentifier(originalLastDecisionSeqConstraint),
      );
      await weakenClient.query(
        "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 " +
          "ADD CONSTRAINT schema_admission_weakened_last_decision_seq_v1 " +
          "CHECK (last_decision_seq > 0 OR TRUE)",
      );
    } finally {
      weakenClient.release();
    }

    const weakenedHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(weakenedHeld.ok, false, JSON.stringify(weakenedHeld));
    if (weakenedHeld.ok) throw new Error("expected weakened CHECK hold");
    assert.equal(
      weakenedHeld.reason,
      "dispatcher_postgres_schema_admission_check_definition_mismatch",
    );
    assert.equal(weakenedHeld.schema_query_performed, true);
    assert.equal(weakenedHeld.database_mutation_performed, false);
  } finally {
    if (originalLastDecisionSeqConstraint) {
      const restoreClient = await rawPool.connect();
      try {
        await restoreClient.query(
          "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 " +
            "DROP CONSTRAINT IF EXISTS schema_admission_weakened_last_decision_seq_v1",
        );
        const existing = await restoreClient.query(
          [
            "SELECT 1",
            "FROM pg_catalog.pg_constraint con",
            "JOIN pg_catalog.pg_class c ON c.oid = con.conrelid",
            "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
            "WHERE n.nspname = 'public'",
            "  AND c.relname = 'void_buy_void_payment_keyed_dispatcher_decision_cursors_v1'",
            "  AND con.conname = $1",
          ].join("\n"),
          [originalLastDecisionSeqConstraint],
        );
        if (existing.rows.length === 0) {
          await restoreClient.query(
            "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 " +
              "ADD CONSTRAINT " +
              quoteIdentifier(originalLastDecisionSeqConstraint) +
              " CHECK (last_decision_seq > 0)",
          );
        }
      } finally {
        restoreClient.release();
      }
    }
  }

  let originalActorConstraint = "";
  try {
    const caseClient = await rawPool.connect();
    try {
      const discovered = await caseClient.query(
        [
          "SELECT con.conname::text AS constraint_name",
          "FROM pg_catalog.pg_constraint con",
          "JOIN pg_catalog.pg_class c ON c.oid = con.conrelid",
          "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
          "WHERE n.nspname = 'public'",
          "  AND c.relname = 'void_buy_void_payment_keyed_dispatcher_audit_v1'",
          "  AND con.contype = 'c'",
          "  AND pg_catalog.pg_get_constraintdef(con.oid, false) LIKE '%actor_id%'",
          "ORDER BY con.conname",
        ].join("\n"),
      );
      assert.equal(discovered.rows.length, 1, JSON.stringify(discovered.rows));
      originalActorConstraint = String(
        discovered.rows[0]?.constraint_name || "",
      );
      assert.ok(originalActorConstraint);
      await caseClient.query(
        "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_audit_v1 " +
          "DROP CONSTRAINT " +
          quoteIdentifier(originalActorConstraint),
      );
      await caseClient.query(
        "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_audit_v1 " +
          "ADD CONSTRAINT schema_admission_lowercase_actor_regex_v1 " +
          "CHECK (actor_id IS NULL OR actor_id ~ '^[a-za-z0-9._:@/-]{1,160}$')",
      );
    } finally {
      caseClient.release();
    }

    const caseHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(caseHeld.ok, false, JSON.stringify(caseHeld));
    if (caseHeld.ok) throw new Error("expected literal-case CHECK hold");
    assert.equal(
      caseHeld.reason,
      "dispatcher_postgres_schema_admission_check_definition_mismatch",
    );
    assert.equal(caseHeld.schema_query_performed, true);
    assert.equal(caseHeld.database_mutation_performed, false);
  } finally {
    if (originalActorConstraint) {
      const restoreClient = await rawPool.connect();
      try {
        await restoreClient.query(
          "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_audit_v1 " +
            "DROP CONSTRAINT IF EXISTS schema_admission_lowercase_actor_regex_v1",
        );
        const existing = await restoreClient.query(
          [
            "SELECT 1",
            "FROM pg_catalog.pg_constraint con",
            "JOIN pg_catalog.pg_class c ON c.oid = con.conrelid",
            "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
            "WHERE n.nspname = 'public'",
            "  AND c.relname = 'void_buy_void_payment_keyed_dispatcher_audit_v1'",
            "  AND con.conname = $1",
          ].join("\n"),
          [originalActorConstraint],
        );
        if (existing.rows.length === 0) {
          await restoreClient.query(
            "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_audit_v1 " +
              "ADD CONSTRAINT " +
              quoteIdentifier(originalActorConstraint) +
              " CHECK (actor_id IS NULL OR actor_id ~ '^[A-Za-z0-9._:@/-]{1,160}$')",
          );
        }
      } finally {
        restoreClient.release();
      }
    }
  }

  const inheritanceClient = await rawPool.connect();
  try {
    await inheritanceClient.query(
      "CREATE SCHEMA schema_admission_inheritance_probe_v1",
    );
    await inheritanceClient.query(
      "CREATE TABLE schema_admission_inheritance_probe_v1.child_v1 () " +
        "INHERITS (public.void_buy_void_payment_keyed_dispatcher_decision_cursors_v1)",
    );
  } finally {
    inheritanceClient.release();
  }
  try {
    const inheritanceHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(inheritanceHeld.ok, false, JSON.stringify(inheritanceHeld));
    if (inheritanceHeld.ok) throw new Error("expected inheritance hold");
    assert.equal(
      inheritanceHeld.reason,
      "dispatcher_postgres_schema_admission_relation_policy_mismatch",
    );
    assert.equal(inheritanceHeld.schema_query_performed, true);
    assert.equal(inheritanceHeld.database_mutation_performed, false);
  } finally {
    const cleanupInheritance = await rawPool.connect();
    try {
      await cleanupInheritance.query(
        "DROP SCHEMA IF EXISTS schema_admission_inheritance_probe_v1 CASCADE",
      );
    } finally {
      cleanupInheritance.release();
    }
  }

  let originalPrimaryConstraint = "";
  try {
    const primaryClient = await rawPool.connect();
    try {
      const discovered = await primaryClient.query(
        [
          "SELECT con.conname::text AS constraint_name",
          "FROM pg_catalog.pg_constraint con",
          "JOIN pg_catalog.pg_class c ON c.oid = con.conrelid",
          "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
          "WHERE n.nspname = 'public'",
          "  AND c.relname = 'void_buy_void_payment_keyed_dispatcher_decision_cursors_v1'",
          "  AND con.contype = 'p'",
        ].join("\n"),
      );
      assert.equal(discovered.rows.length, 1, JSON.stringify(discovered.rows));
      originalPrimaryConstraint = String(
        discovered.rows[0]?.constraint_name || "",
      );
      assert.ok(originalPrimaryConstraint);
      await primaryClient.query(
        "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 " +
          "DROP CONSTRAINT " +
          quoteIdentifier(originalPrimaryConstraint),
      );
      await primaryClient.query(
        "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 " +
          "ADD CONSTRAINT schema_admission_deferrable_primary_v1 " +
          "PRIMARY KEY (attempt_id) DEFERRABLE INITIALLY DEFERRED",
      );
    } finally {
      primaryClient.release();
    }

    const deferrableHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(deferrableHeld.ok, false, JSON.stringify(deferrableHeld));
    if (deferrableHeld.ok) throw new Error("expected deferrable primary hold");
    assert.equal(
      deferrableHeld.reason,
      "dispatcher_postgres_schema_admission_constraint_policy_mismatch",
    );
    assert.equal(deferrableHeld.schema_query_performed, true);
    assert.equal(deferrableHeld.database_mutation_performed, false);
  } finally {
    if (originalPrimaryConstraint) {
      const restorePrimary = await rawPool.connect();
      try {
        await restorePrimary.query(
          "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 " +
            "DROP CONSTRAINT IF EXISTS schema_admission_deferrable_primary_v1",
        );
        const existing = await restorePrimary.query(
          [
            "SELECT 1",
            "FROM pg_catalog.pg_constraint con",
            "JOIN pg_catalog.pg_class c ON c.oid = con.conrelid",
            "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
            "WHERE n.nspname = 'public'",
            "  AND c.relname = 'void_buy_void_payment_keyed_dispatcher_decision_cursors_v1'",
            "  AND con.conname = $1",
          ].join("\n"),
          [originalPrimaryConstraint],
        );
        if (existing.rows.length === 0) {
          await restorePrimary.query(
            "ALTER TABLE public.void_buy_void_payment_keyed_dispatcher_decision_cursors_v1 " +
              "ADD CONSTRAINT " +
              quoteIdentifier(originalPrimaryConstraint) +
              " PRIMARY KEY (attempt_id)",
          );
        }
      } finally {
        restorePrimary.release();
      }
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
  console.log("exact_check_constraint_definitions=true");
  console.log("weakened_check_same_count_and_token_rejected=true");
  console.log("case_sensitive_check_literal_drift_rejected=true");
  console.log("table_inheritance_rejected=true");
  console.log("deferrable_primary_key_rejected=true");
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
