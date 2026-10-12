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
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_OWNER_ROLE_V1,
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
  "pg_catalog.pg_roles",
  "pg_catalog.pg_has_role",
  "pg_catalog.has_database_privilege",
  "pg_catalog.has_schema_privilege",
  "pg_catalog.has_table_privilege",
  "pg_catalog.aclexplode",
  "pg_catalog.acldefault",
  "pg_catalog.pg_constraint",
  "pg_catalog.pg_proc",
  "pg_catalog.pg_index",
  "pg_catalog.pg_trigger",
  "current_schemas(true)",
  "session_user",
  "current_setting('application_name')",
  "current_setting('client_encoding')",
  "pg_catalog.pg_my_temp_schema()",
  "transaction_read_only",
  "transaction_isolation",
]) {
  assert.equal(source.includes(fragment), true, fragment);
}
assert.equal(
  source.includes(
    "pg_catalog.aclexplode(COALESCE(a.attacl, ARRAY[]::pg_catalog.aclitem[]))",
  ),
  false,
  "column ACL enumeration must not synthesize a zero-dimensional aclitem array",
);

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
assert.equal(authority.exact_session_user_required, true);
assert.equal(authority.exact_application_name_required, true);
assert.equal(authority.utf8_client_encoding_required, true);
assert.equal(authority.runtime_database_ownership_allowed, false);
assert.equal(authority.fixed_owner_role_required, true);
assert.equal(authority.owner_role_login_allowed, false);
assert.equal(authority.elevated_owner_role_attributes_allowed, false);
assert.equal(authority.elevated_runtime_role_attributes_allowed, false);
assert.equal(authority.runtime_owner_role_membership_allowed, false);
assert.equal(authority.runtime_other_role_memberships_allowed, false);
assert.equal(authority.owner_non_database_owner_role_memberships_allowed, false);
assert.equal(authority.runtime_database_connect_required, true);
assert.equal(authority.runtime_database_create_allowed, false);
assert.equal(authority.runtime_database_temp_allowed, false);
assert.equal(authority.other_nonowner_database_privileges_allowed, false);
assert.equal(authority.public_schema_owner_bound_to_database_owner, true);
assert.equal(authority.runtime_public_schema_usage_required, true);
assert.equal(authority.runtime_public_schema_create_allowed, false);
assert.equal(authority.other_nonowner_public_schema_privileges_allowed, false);
assert.equal(authority.exact_runtime_table_privileges_required, true);
assert.equal(authority.other_nonowner_table_privileges_allowed, false);
assert.equal(authority.exact_search_path_required, true);
assert.equal(authority.active_temporary_schema_allowed, false);
assert.equal(authority.exact_non_system_schema_set_required, true);
assert.equal(authority.public_user_defined_routines_allowed, false);
assert.equal(authority.partition_membership_allowed, false);
assert.equal(authority.table_inheritance_allowed, false);
assert.equal(authority.exact_table_column_shape_required, true);
assert.equal(authority.column_level_privileges_allowed, false);
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

const adminUrl = String(
  process.env.VOID_TEST_POSTGRES_SCHEMA_ADMISSION_ADMIN_URL || "",
).trim();

if (!url && !adminUrl) {
  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1_STATIC_GREEN",
  );
  console.log("static_source_and_authority_proof=true");
  console.log("live_postgres_fixture=false");
  console.log("schema_query_performed=false");
  console.log("database_mutation_performed=false");
  console.log("runtime_route_mount=false");
  console.log("wallet_access=false");
  console.log("signing=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");
  process.exit(0);
}

assert.ok(url, "VOID_TEST_POSTGRES_SCHEMA_ADMISSION_URL required");
assert.ok(
  adminUrl,
  "VOID_TEST_POSTGRES_SCHEMA_ADMISSION_ADMIN_URL required",
);

const rawPool = new Pool({
  connectionString: url,
  application_name:
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
  options: "-c client_encoding=UTF8 -c search_path=pg_catalog,public",
  max: 2,
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 5000,
});

const adminPool = new Pool({
  connectionString: adminUrl,
  application_name: "void-node-buy-void-dispatcher-schema-admission-admin-proof-v1",
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

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_OWNER_ROLE_V1,
  "void_buy_void_dispatcher_owner_v1",
);

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
  if (accepted.ok === false) throw new Error(accepted.reason);
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  assert.equal(
    accepted.marker,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1,
  );
  assert.equal(accepted.status, "schema_admitted");
  assert.match(accepted.schema_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(accepted.schema_contract_tables.length, 3);
  assert.equal(accepted.schema_query_performed, true);
  assert.equal(accepted.database_mutation_performed, false);

  const tempPrivilegeAdmin = await adminPool.connect();
  try {
    await tempPrivilegeAdmin.query(
      "GRANT TEMPORARY ON DATABASE void_buy_void_dispatcher_v1 TO void_buy_void_dispatcher_v1",
    );
  } finally {
    tempPrivilegeAdmin.release();
  }

  const tempClient = await rawPool.connect();
  try {
    await tempClient.query(
      "CREATE TEMP TABLE schema_admission_temp_probe_v1 (probe integer)",
    );
    const revokeTempAdmin = await adminPool.connect();
    try {
      await revokeTempAdmin.query(
        "REVOKE TEMPORARY ON DATABASE void_buy_void_dispatcher_v1 FROM void_buy_void_dispatcher_v1",
      );
    } finally {
      revokeTempAdmin.release();
    }

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
    // Revoking TEMP does not retroactively make a backend that materialized
    // pg_temp admissible. Destroy the session instead of pooling it.
    tempClient.release(new Error("discard_schema_admission_temp_session"));
    const ensureTempRevoked = await adminPool.connect();
    try {
      await ensureTempRevoked.query(
        "REVOKE TEMPORARY ON DATABASE void_buy_void_dispatcher_v1 FROM void_buy_void_dispatcher_v1",
      );
    } finally {
      ensureTempRevoked.release();
    }
  }

  const schemaGrantClient = await adminPool.connect();
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
      "dispatcher_postgres_schema_admission_public_schema_privilege_mismatch",
    );
    assert.equal(schemaAclHeld.schema_query_performed, true);
    assert.equal(schemaAclHeld.database_mutation_performed, false);
  } finally {
    const revokeSchemaGrantClient = await adminPool.connect();
    try {
      await revokeSchemaGrantClient.query(
        "REVOKE CREATE ON SCHEMA public FROM PUBLIC",
      );
    } finally {
      revokeSchemaGrantClient.release();
    }
  }

  const tableGrantClient = await adminPool.connect();
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
    const revokeTableGrantClient = await adminPool.connect();
    try {
      await revokeTableGrantClient.query(
        "REVOKE SELECT ON public.void_buy_void_payment_keyed_dispatcher_jobs_v1 FROM PUBLIC",
      );
    } finally {
      revokeTableGrantClient.release();
    }
  }

  const columnGrantAdmin = await adminPool.connect();
  try {
    await columnGrantAdmin.query(
      "GRANT SELECT (attempt_id) ON public.void_buy_void_payment_keyed_dispatcher_jobs_v1 TO PUBLIC",
    );
  } finally {
    columnGrantAdmin.release();
  }
  try {
    const columnAclHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(columnAclHeld.ok, false);
    if (columnAclHeld.ok) throw new Error("expected column ACL hold");
    assert.equal(
      columnAclHeld.reason,
      "dispatcher_postgres_schema_admission_column_shape_mismatch",
    );
  } finally {
    const revokeColumnGrantAdmin = await adminPool.connect();
    try {
      await revokeColumnGrantAdmin.query(
        "REVOKE SELECT (attempt_id) ON public.void_buy_void_payment_keyed_dispatcher_jobs_v1 FROM PUBLIC",
      );
    } finally {
      revokeColumnGrantAdmin.release();
    }
  }

  const ownerLoginAdmin = await adminPool.connect();
  try {
    await ownerLoginAdmin.query(
      "ALTER ROLE void_buy_void_dispatcher_owner_v1 LOGIN",
    );
  } finally {
    ownerLoginAdmin.release();
  }
  try {
    const ownerLoginHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(ownerLoginHeld.ok, false);
    if (ownerLoginHeld.ok) throw new Error("expected owner-login hold");
    assert.equal(
      ownerLoginHeld.reason,
      "dispatcher_postgres_schema_admission_role_or_database_privilege_mismatch",
    );
  } finally {
    const restoreOwnerLoginAdmin = await adminPool.connect();
    try {
      await restoreOwnerLoginAdmin.query(
        "ALTER ROLE void_buy_void_dispatcher_owner_v1 NOLOGIN",
      );
    } finally {
      restoreOwnerLoginAdmin.release();
    }
  }

  const membershipAdmin = await adminPool.connect();
  try {
    await membershipAdmin.query(
      "GRANT void_buy_void_dispatcher_owner_v1 TO void_buy_void_dispatcher_v1",
    );
  } finally {
    membershipAdmin.release();
  }
  try {
    const membershipHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(membershipHeld.ok, false);
    if (membershipHeld.ok) throw new Error("expected owner-membership hold");
    assert.equal(
      membershipHeld.reason,
      "dispatcher_postgres_schema_admission_role_or_database_privilege_mismatch",
    );
  } finally {
    const revokeMembershipAdmin = await adminPool.connect();
    try {
      await revokeMembershipAdmin.query(
        "REVOKE void_buy_void_dispatcher_owner_v1 FROM void_buy_void_dispatcher_v1",
      );
    } finally {
      revokeMembershipAdmin.release();
    }
  }

  const runtimePredefinedRoleAdmin = await adminPool.connect();
  try {
    await runtimePredefinedRoleAdmin.query(
      "GRANT pg_read_all_settings TO void_buy_void_dispatcher_v1",
    );
  } finally {
    runtimePredefinedRoleAdmin.release();
  }
  try {
    const runtimePredefinedHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(runtimePredefinedHeld.ok, false);
    if (runtimePredefinedHeld.ok) {
      throw new Error("expected runtime predefined-role membership hold");
    }
    assert.equal(
      runtimePredefinedHeld.reason,
      "dispatcher_postgres_schema_admission_runtime_role_membership_mismatch",
    );
  } finally {
    const revokeRuntimePredefinedAdmin = await adminPool.connect();
    try {
      await revokeRuntimePredefinedAdmin.query(
        "REVOKE pg_read_all_settings FROM void_buy_void_dispatcher_v1",
      );
    } finally {
      revokeRuntimePredefinedAdmin.release();
    }
  }

  const ownerPredefinedRoleAdmin = await adminPool.connect();
  try {
    await ownerPredefinedRoleAdmin.query(
      "GRANT pg_read_all_settings TO void_buy_void_dispatcher_owner_v1",
    );
  } finally {
    ownerPredefinedRoleAdmin.release();
  }
  try {
    const ownerPredefinedHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(ownerPredefinedHeld.ok, false);
    if (ownerPredefinedHeld.ok) {
      throw new Error("expected owner predefined-role membership hold");
    }
    assert.equal(
      ownerPredefinedHeld.reason,
      "dispatcher_postgres_schema_admission_owner_role_membership_mismatch",
    );
  } finally {
    const revokeOwnerPredefinedAdmin = await adminPool.connect();
    try {
      await revokeOwnerPredefinedAdmin.query(
        "REVOKE pg_read_all_settings FROM void_buy_void_dispatcher_owner_v1",
      );
    } finally {
      revokeOwnerPredefinedAdmin.release();
    }
  }

  const extraDeleteAdmin = await adminPool.connect();
  try {
    await extraDeleteAdmin.query(
      "GRANT DELETE ON public.void_buy_void_payment_keyed_dispatcher_jobs_v1 TO void_buy_void_dispatcher_v1",
    );
  } finally {
    extraDeleteAdmin.release();
  }
  try {
    const extraDeleteHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(extraDeleteHeld.ok, false);
    if (extraDeleteHeld.ok) throw new Error("expected extra DELETE hold");
    assert.equal(
      extraDeleteHeld.reason,
      "dispatcher_postgres_schema_admission_relation_policy_mismatch",
    );
  } finally {
    const revokeDeleteAdmin = await adminPool.connect();
    try {
      await revokeDeleteAdmin.query(
        "REVOKE DELETE ON public.void_buy_void_payment_keyed_dispatcher_jobs_v1 FROM void_buy_void_dispatcher_v1",
      );
    } finally {
      revokeDeleteAdmin.release();
    }
  }

  const missingSelectAdmin = await adminPool.connect();
  try {
    await missingSelectAdmin.query(
      "REVOKE SELECT ON public.void_buy_void_payment_keyed_dispatcher_jobs_v1 FROM void_buy_void_dispatcher_v1",
    );
  } finally {
    missingSelectAdmin.release();
  }
  try {
    const missingSelectHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(missingSelectHeld.ok, false);
    if (missingSelectHeld.ok) throw new Error("expected missing SELECT hold");
    assert.equal(
      missingSelectHeld.reason,
      "dispatcher_postgres_schema_admission_relation_policy_mismatch",
    );
  } finally {
    const restoreSelectAdmin = await adminPool.connect();
    try {
      await restoreSelectAdmin.query(
        "GRANT SELECT ON public.void_buy_void_payment_keyed_dispatcher_jobs_v1 TO void_buy_void_dispatcher_v1",
      );
    } finally {
      restoreSelectAdmin.release();
    }
  }

  let originalLastDecisionSeqConstraint = "";
  try {
    const weakenClient = await adminPool.connect();
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
      const restoreClient = await adminPool.connect();
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
    const caseClient = await adminPool.connect();
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
      const restoreClient = await adminPool.connect();
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

  const inheritanceClient = await adminPool.connect();
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
    const cleanupInheritance = await adminPool.connect();
    try {
      await cleanupInheritance.query(
        "DROP SCHEMA IF EXISTS schema_admission_inheritance_probe_v1 CASCADE",
      );
    } finally {
      cleanupInheritance.release();
    }
  }

  const extraSchemaAdmin = await adminPool.connect();
  try {
    await extraSchemaAdmin.query(
      "CREATE SCHEMA schema_admission_extra_schema_v1",
    );
  } finally {
    extraSchemaAdmin.release();
  }
  try {
    const extraSchemaHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(extraSchemaHeld.ok, false, JSON.stringify(extraSchemaHeld));
    if (extraSchemaHeld.ok) throw new Error("expected extra-schema hold");
    assert.equal(
      extraSchemaHeld.reason,
      "dispatcher_postgres_schema_admission_schema_set_mismatch",
    );
  } finally {
    const cleanupExtraSchema = await adminPool.connect();
    try {
      await cleanupExtraSchema.query(
        "DROP SCHEMA IF EXISTS schema_admission_extra_schema_v1 CASCADE",
      );
    } finally {
      cleanupExtraSchema.release();
    }
  }

  const routineAdmin = await adminPool.connect();
  try {
    await routineAdmin.query(
      "CREATE FUNCTION public.schema_admission_security_definer_probe_v1() " +
        "RETURNS integer LANGUAGE SQL SECURITY DEFINER AS 'SELECT 1'",
    );
  } finally {
    routineAdmin.release();
  }
  try {
    const routineHeld =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
    assert.equal(routineHeld.ok, false, JSON.stringify(routineHeld));
    if (routineHeld.ok) throw new Error("expected public-routine hold");
    assert.equal(
      routineHeld.reason,
      "dispatcher_postgres_schema_admission_public_routine_present",
    );
  } finally {
    const cleanupRoutine = await adminPool.connect();
    try {
      await cleanupRoutine.query(
        "DROP FUNCTION IF EXISTS public.schema_admission_security_definer_probe_v1()",
      );
    } finally {
      cleanupRoutine.release();
    }
  }

  let originalPrimaryConstraint = "";
  try {
    const primaryClient = await adminPool.connect();
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
      const restorePrimary = await adminPool.connect();
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

  const adversary = await adminPool.connect();
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
  console.log("exact_session_user=true");
  console.log("exact_application_name=true");
  console.log("utf8_client_encoding=true");
  console.log("exact_database_owner_role=true");
  console.log("runtime_database_owner=false");
  console.log("owner_role_nologin=true");
  console.log("runtime_owner_role_membership=false");
  console.log("runtime_other_role_memberships=false");
  console.log("owner_only_pg_database_owner_membership=true");
  console.log("runtime_database_connect_only=true");
  console.log("runtime_database_temp=false");
  console.log("public_schema_owner_bound=true");
  console.log("runtime_public_schema_usage_only=true");
  console.log("exact_runtime_table_acl=true");
  console.log("extra_runtime_delete_rejected=true");
  console.log("missing_runtime_select_rejected=true");
  console.log("exact_search_path=true");
  console.log("effective_search_path_array=true");
  console.log("active_temporary_schema_rejected=true");
  console.log("exact_non_system_schema_set=true");
  console.log("public_user_defined_routines_rejected=true");
  console.log("exact_relation_set=true");
  console.log("exact_column_shape=true");
  console.log("column_level_privileges_rejected=true");
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
  await adminPool.end();
}
