import crypto from "node:crypto";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1,
  type BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
} from "./buy_void_payment_keyed_dispatcher_postgres_production_config_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1,
  type BuyVoidPaymentKeyedDispatcherPostgresClientV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_store_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1 =
  Object.freeze({
    source_only_schema_admission: true,
    accepted_connection_factory_required: true,
    database_transaction_read_only: true,
    catalog_selects_only: true,
    repeatable_read_snapshot: true,
    bounded_statement_timeout_ms: 5000,
    exact_database_identity_required: true,
    exact_database_user_required: true,
    exact_database_owner_required: true,
    public_schema_owner_bound_to_database_owner: true,
    nonowner_public_schema_create_allowed: false,
    nonowner_table_privileges_allowed: false,
    exact_search_path_required: true,
    active_temporary_schema_allowed: false,
    exact_public_relation_set_required: true,
    partition_membership_allowed: false,
    table_inheritance_allowed: false,
    exact_table_column_shape_required: true,
    exact_primary_key_shape_required: true,
    validated_constraints_required: true,
    deferrable_constraints_allowed: false,
    no_inherit_check_constraints_allowed: false,
    exact_index_set_required: true,
    primary_index_btree_only: true,
    primary_index_include_columns_allowed: false,
    expected_check_constraint_counts_required: true,
    check_constraint_semantic_tokens_required: true,
    exact_check_constraint_definitions_required: true,
    non_internal_triggers_allowed: false,
    row_level_security_allowed: false,
    automatic_schema_migration: false,
    schema_mutation: false,
    data_mutation: false,
    runtime_route_mount: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
  } as const);

type ColumnExpectationV1 = {
  name: string;
  type: string;
  not_null: boolean;
};

type TableExpectationV1 = {
  columns: readonly ColumnExpectationV1[];
  primary_key: readonly string[];
  check_count: number;
  required_check_tokens: readonly string[];
};

const HEX64 = "^[0-9a-f]{64}$";
const HEX32 = "^[0-9a-f]{32}$";
const ACTOR = "^[A-Za-z0-9._:@/-]{1,160}$";

const EXPECTED_V1: Readonly<Record<string, TableExpectationV1>> = Object.freeze({
  [VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1.jobs]: Object.freeze({
    columns: Object.freeze([
      { name: "attempt_id", type: "text", not_null: true },
      { name: "request_fingerprint_sha256", type: "text", not_null: true },
      { name: "submitted_at_us", type: "bigint", not_null: true },
      { name: "result_fingerprint_sha256", type: "text", not_null: false },
      { name: "published", type: "boolean", not_null: true },
      { name: "published_gen", type: "bigint", not_null: false },
      { name: "lease_gen", type: "bigint", not_null: true },
      { name: "lease_token", type: "text", not_null: false },
      { name: "lease_owner", type: "text", not_null: false },
      { name: "lease_expires_us", type: "bigint", not_null: false },
      { name: "version", type: "bigint", not_null: true },
    ]),
    primary_key: Object.freeze(["attempt_id"]),
    check_count: 12,
    required_check_tokens: Object.freeze([
      "attempt_id~'" + HEX64 + "'",
      "request_fingerprint_sha256~'" + HEX64 + "'",
      "submitted_at_us>0",
      "result_fingerprint_sha256isnull",
      "result_fingerprint_sha256~'" + HEX64 + "'",
      "published_genisnull",
      "published_gen>0",
      "lease_gen>=0",
      "lease_token~'" + HEX32 + "'",
      "lease_owner~'" + ACTOR + "'",
      "lease_expires_us>0",
      "version>=0",
      "lease_tokenisnullandlease_ownerisnullandlease_expires_usisnull",
      "published=true",
      "published=false",
    ]),
  }),
  [VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1.decision_cursors]:
    Object.freeze({
      columns: Object.freeze([
        { name: "attempt_id", type: "text", not_null: true },
        { name: "last_decision_seq", type: "bigint", not_null: true },
      ]),
      primary_key: Object.freeze(["attempt_id"]),
      check_count: 2,
      required_check_tokens: Object.freeze([
        "attempt_id~'" + HEX64 + "'",
        "last_decision_seq>0",
      ]),
    }),
  [VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1.audit]: Object.freeze({
    columns: Object.freeze([
      { name: "attempt_id", type: "text", not_null: true },
      { name: "decision_seq", type: "bigint", not_null: true },
      { name: "event_type", type: "text", not_null: true },
      { name: "outcome", type: "text", not_null: true },
      { name: "actor_id", type: "text", not_null: false },
      { name: "lease_gen", type: "bigint", not_null: true },
      { name: "created_at_us", type: "bigint", not_null: true },
      { name: "detail", type: "jsonb", not_null: true },
    ]),
    primary_key: Object.freeze(["attempt_id", "decision_seq"]),
    check_count: 8,
    required_check_tokens: Object.freeze([
      "attempt_id~'" + HEX64 + "'",
      "decision_seq>0",
      "'submit'",
      "'publish_reject_expired'",
      "'success'",
      "'observed'",
      "actor_id~'" + ACTOR + "'",
      "lease_gen>=0",
      "created_at_us>0",
      "jsonb_typeofdetail='object'",
    ]),
  }),
});

const EXPECTED_CHECK_DEFINITIONS_V1: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    [VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1.jobs]:
      Object.freeze([
        "CHECK ((attempt_id ~ '" + HEX64 + "'::text))",
        "CHECK ((request_fingerprint_sha256 ~ '" + HEX64 + "'::text))",
        "CHECK ((submitted_at_us > 0))",
        "CHECK (((result_fingerprint_sha256 IS NULL) OR (result_fingerprint_sha256 ~ '" + HEX64 + "'::text)))",
        "CHECK (((published_gen IS NULL) OR (published_gen > 0)))",
        "CHECK ((lease_gen >= 0))",
        "CHECK (((lease_token IS NULL) OR (lease_token ~ '" + HEX32 + "'::text)))",
        "CHECK (((lease_owner IS NULL) OR (lease_owner ~ '" + ACTOR + "'::text)))",
        "CHECK (((lease_expires_us IS NULL) OR (lease_expires_us > 0)))",
        "CHECK ((version >= 0))",
        "CHECK ((((lease_token IS NULL) AND (lease_owner IS NULL) AND (lease_expires_us IS NULL)) OR ((lease_token IS NOT NULL) AND (lease_owner IS NOT NULL) AND (lease_expires_us IS NOT NULL) AND (lease_gen > 0))))",
        "CHECK ((((published = true) AND (result_fingerprint_sha256 IS NOT NULL) AND (published_gen = lease_gen) AND (lease_token IS NULL) AND (lease_owner IS NULL) AND (lease_expires_us IS NULL)) OR ((published = false) AND (result_fingerprint_sha256 IS NULL) AND (published_gen IS NULL))))",
      ]),
    [VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1.decision_cursors]:
      Object.freeze([
        "CHECK ((attempt_id ~ '" + HEX64 + "'::text))",
        "CHECK ((last_decision_seq > 0))",
      ]),
    [VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1.audit]:
      Object.freeze([
        "CHECK ((attempt_id ~ '" + HEX64 + "'::text))",
        "CHECK ((decision_seq > 0))",
        "CHECK ((event_type = ANY (ARRAY['SUBMIT'::text, 'SUBMIT_REPLAY'::text, 'PAYLOAD_CONFLICT'::text, 'CLAIM'::text, 'CLAIM_REJECT_NOT_FOUND'::text, 'CLAIM_REJECT_PUBLISHED'::text, 'CLAIM_REJECT_ACTIVE'::text, 'LEASE_EXPIRED_RECLAIM'::text, 'LEASE_RENEW'::text, 'RENEW_REJECT_NOT_FOUND'::text, 'RENEW_REJECT_PUBLISHED'::text, 'RENEW_REJECT_STALE'::text, 'RENEW_REJECT_UNAUTHORIZED'::text, 'RENEW_REJECT_EXPIRED'::text, 'PUBLISH'::text, 'PUBLISH_REPLAY'::text, 'PUBLISH_REJECT_NOT_FOUND'::text, 'PUBLISH_REJECT_STALE'::text, 'PUBLISH_REJECT_UNAUTHORIZED'::text, 'PUBLISH_REJECT_EXPIRED'::text])))",
        "CHECK ((outcome = ANY (ARRAY['SUCCESS'::text, 'IDEMPOTENT'::text, 'REJECTED'::text, 'OBSERVED'::text])))",
        "CHECK (((actor_id IS NULL) OR (actor_id ~ '" + ACTOR + "'::text)))",
        "CHECK ((lease_gen >= 0))",
        "CHECK ((created_at_us > 0))",
        "CHECK ((jsonb_typeof(detail) = 'object'::text))",
      ]),
  });

const EXPECTED_TABLE_NAMES = Object.freeze(Object.keys(EXPECTED_V1).sort());
const CONFIG_FINGERPRINT = /^[0-9a-f]{64}$/;

export type BuyVoidPaymentKeyedDispatcherPostgresSchemaAdmissionReadyV1 = {
  ok: true;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1;
  version: 1;
  status: "schema_admitted";
  configuration_fingerprint_sha256: string;
  schema_fingerprint_sha256: string;
  schema_contract_tables: readonly string[];
  schema_query_performed: true;
  database_mutation_performed: false;
  authority:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1;
};

export type BuyVoidPaymentKeyedDispatcherPostgresSchemaAdmissionHeldV1 = {
  ok: false;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1;
  version: 1;
  status: "held";
  reason: string;
  detail?: Record<string, string | number | boolean>;
  schema_query_performed: boolean;
  database_mutation_performed: false;
  authority:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1;
};

export type BuyVoidPaymentKeyedDispatcherPostgresSchemaAdmissionDecisionV1 =
  | BuyVoidPaymentKeyedDispatcherPostgresSchemaAdmissionReadyV1
  | BuyVoidPaymentKeyedDispatcherPostgresSchemaAdmissionHeldV1;

class SchemaAdmissionHoldV1 extends Error {
  readonly reason: string;
  readonly detail?: Record<string, string | number | boolean>;

  constructor(
    reason: string,
    detail?: Record<string, string | number | boolean>,
  ) {
    super(reason);
    this.name = "SchemaAdmissionHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(
  reason: string,
  schemaQueryPerformed: boolean,
  detail?: Record<string, string | number | boolean>,
): BuyVoidPaymentKeyedDispatcherPostgresSchemaAdmissionHeldV1 {
  return {
    ok: false,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1,
    version: 1,
    status: "held",
    reason,
    ...(detail ? { detail } : {}),
    schema_query_performed: schemaQueryPerformed,
    database_mutation_performed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1,
  };
}

function fail(
  reason: string,
  detail?: Record<string, string | number | boolean>,
): never {
  throw new SchemaAdmissionHoldV1(reason, detail);
}

function safeErrorCode(error: unknown): string | null {
  const raw = String((error as { code?: unknown } | null)?.code || "");
  return /^[A-Za-z0-9._:-]{1,40}$/.test(raw) ? raw : null;
}

function canonicalConstraint(value: unknown): string {
  return String(value ?? "")
    .replace(/::(?:text|bigint|boolean|jsonb)(?:\[\])?/g, "")
    .replace(/[\s()"`]/g, "");
}

function stringValue(
  row: Record<string, unknown>,
  key: string,
  reason: string,
): string {
  const value = row[key];
  if (typeof value !== "string") fail(reason);
  return value;
}

function stringArrayValue(
  row: Record<string, unknown>,
  key: string,
  reason: string,
): string[] {
  const value = row[key];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string")
  ) {
    fail(reason);
  }
  return value as string[];
}

function booleanValue(
  row: Record<string, unknown>,
  key: string,
  reason: string,
): boolean {
  const value = row[key];
  if (typeof value !== "boolean") fail(reason);
  return value;
}

function numberValue(
  row: Record<string, unknown>,
  key: string,
  reason: string,
): number {
  const value = Number(row[key]);
  if (!Number.isSafeInteger(value)) fail(reason);
  return value;
}

function assertFactory(
  factory: unknown,
): asserts factory is BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1 {
  if (!factory || typeof factory !== "object") {
    fail("dispatcher_postgres_schema_admission_factory_invalid");
  }
  const value =
    factory as BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1;
  if (
    value.ok !== true ||
    value.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1 ||
    value.version !== 1 ||
    value.status !== "ready" ||
    value.authority !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1 ||
    !CONFIG_FINGERPRINT.test(value.configuration_fingerprint_sha256) ||
    value.connection_policy.database !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1 ||
    value.connection_policy.user !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1 ||
    value.connection_policy.startup_options !==
      "-c client_encoding=UTF8 -c search_path=pg_catalog,public" ||
    value.connection_policy.connection_string_used !== false ||
    value.connection_policy.ambient_libpq_fallback !== false ||
    !value.pool ||
    typeof value.pool.connect !== "function"
  ) {
    fail("dispatcher_postgres_schema_admission_factory_invalid");
  }
}

function exactArray(actual: readonly string[], expected: readonly string[]): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

const SESSION_SQL = [
  "SELECT",
  "  current_database()::text AS database_name,",
  "  current_user::text AS user_name,",
  "  (SELECT pg_catalog.pg_get_userbyid(d.datdba)::text",
  "   FROM pg_catalog.pg_database d",
  "   WHERE d.datname = current_database()) AS database_owner,",
  "  (SELECT pg_catalog.pg_get_userbyid(n.nspowner)::text",
  "   FROM pg_catalog.pg_namespace n",
  "   WHERE n.nspname = 'public') AS public_schema_owner,",
  "  (SELECT count(*)::integer",
  "   FROM pg_catalog.pg_namespace n",
  "   CROSS JOIN LATERAL pg_catalog.aclexplode(",
  "     COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner))",
  "   ) acl",
  "   WHERE n.nspname = 'public'",
  "     AND acl.privilege_type = 'CREATE'",
  "     AND acl.grantee <> n.nspowner",
  "  ) AS public_schema_nonowner_create_grants,",
  "  current_schemas(true)::text[] AS effective_search_path,",
  "  pg_catalog.pg_my_temp_schema()::text AS temp_schema_oid,",
  "  current_setting('transaction_read_only')::text AS transaction_read_only",
].join(String.fromCharCode(10));

const RELATIONS_SQL = [
  "SELECT",
  "  c.relname::text AS table_name,",
  "  c.relkind::text AS relkind,",
  "  c.relpersistence::text AS persistence,",
  "  c.relispartition AS is_partition,",
  "  (SELECT count(*)::integer FROM pg_catalog.pg_inherits inh WHERE inh.inhrelid = c.oid) AS inheritance_parent_count,",
  "  (SELECT count(*)::integer FROM pg_catalog.pg_inherits inh WHERE inh.inhparent = c.oid) AS inheritance_child_count,",
  "  pg_catalog.pg_get_userbyid(c.relowner)::text AS table_owner,",
  "  (SELECT count(*)::integer",
  "   FROM pg_catalog.aclexplode(",
  "     COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))",
  "   ) acl",
  "   WHERE acl.grantee <> c.relowner",
  "  ) AS nonowner_acl_count,",
  "  c.relrowsecurity AS row_security,",
  "  c.relforcerowsecurity AS force_row_security",
  "FROM pg_catalog.pg_class c",
  "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
  "WHERE n.nspname = 'public'",
  "  AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')",
  "ORDER BY c.relname",
].join(String.fromCharCode(10));

const COLUMNS_SQL = [
  "SELECT",
  "  c.relname::text AS table_name,",
  "  a.attnum::integer AS ordinal_position,",
  "  a.attname::text AS column_name,",
  "  pg_catalog.format_type(a.atttypid, a.atttypmod)::text AS data_type,",
  "  a.attnotnull AS not_null,",
  "  a.attidentity::text AS identity_kind,",
  "  a.attgenerated::text AS generated_kind,",
  "  pg_catalog.pg_get_expr(d.adbin, d.adrelid)::text AS default_expression",
  "FROM pg_catalog.pg_class c",
  "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
  "JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid",
  "LEFT JOIN pg_catalog.pg_attrdef d",
  "  ON d.adrelid = c.oid AND d.adnum = a.attnum",
  "WHERE n.nspname = 'public'",
  "  AND c.relname = ANY($1::text[])",
  "  AND a.attnum > 0",
  "  AND NOT a.attisdropped",
  "ORDER BY c.relname, a.attnum",
].join(String.fromCharCode(10));

const CONSTRAINTS_SQL = [
  "SELECT",
  "  c.relname::text AS table_name,",
  "  con.contype::text AS constraint_type,",
  "  con.convalidated AS is_validated,",
  "  con.condeferrable AS is_deferrable,",
  "  con.condeferred AS is_initially_deferred,",
  "  con.connoinherit AS is_no_inherit,",
  "  pg_catalog.pg_get_constraintdef(con.oid, false)::text AS definition,",
  "  COALESCE(",
  "    ARRAY(",
  "      SELECT a.attname::text",
  "      FROM unnest(con.conkey) WITH ORDINALITY AS key(attnum, ord)",
  "      JOIN pg_catalog.pg_attribute a",
  "        ON a.attrelid = con.conrelid AND a.attnum = key.attnum",
  "      ORDER BY key.ord",
  "    ),",
  "    ARRAY[]::text[]",
  "  ) AS key_columns",
  "FROM pg_catalog.pg_constraint con",
  "JOIN pg_catalog.pg_class c ON c.oid = con.conrelid",
  "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
  "WHERE n.nspname = 'public'",
  "  AND c.relname = ANY($1::text[])",
  "ORDER BY c.relname, con.contype, con.oid",
].join(String.fromCharCode(10));

const INDEXES_SQL = [
  "SELECT",
  "  c.relname::text AS table_name,",
  "  ic.relname::text AS index_name,",
  "  i.indisprimary AS is_primary,",
  "  i.indisunique AS is_unique,",
  "  i.indisvalid AS is_valid,",
  "  i.indisready AS is_ready,",
  "  am.amname::text AS access_method,",
  "  i.indnkeyatts::integer AS key_attribute_count,",
  "  i.indnatts::integer AS total_attribute_count,",
  "  (i.indpred IS NULL) AS no_predicate,",
  "  (i.indexprs IS NULL) AS no_expressions",
  "FROM pg_catalog.pg_index i",
  "JOIN pg_catalog.pg_class c ON c.oid = i.indrelid",
  "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
  "JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid",
  "JOIN pg_catalog.pg_am am ON am.oid = ic.relam",
  "WHERE n.nspname = 'public'",
  "  AND c.relname = ANY($1::text[])",
  "ORDER BY c.relname, ic.relname",
].join(String.fromCharCode(10));

const TRIGGERS_SQL = [
  "SELECT c.relname::text AS table_name, t.tgname::text AS trigger_name",
  "FROM pg_catalog.pg_trigger t",
  "JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid",
  "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace",
  "WHERE n.nspname = 'public'",
  "  AND c.relname = ANY($1::text[])",
  "  AND NOT t.tgisinternal",
  "ORDER BY c.relname, t.tgname",
].join(String.fromCharCode(10));

async function inspect(
  client: BuyVoidPaymentKeyedDispatcherPostgresClientV1,
): Promise<{ fingerprint: string }> {
  const state = await client.query(SESSION_SQL);
  if (state.rows.length !== 1) {
    fail("dispatcher_postgres_schema_admission_session_state_invalid");
  }
  const stateRow = state.rows[0] as Record<string, unknown>;
  if (
    stringValue(
      stateRow,
      "database_name",
      "dispatcher_postgres_schema_admission_database_state_invalid",
    ) !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1
  ) {
    fail("dispatcher_postgres_schema_admission_database_identity_mismatch");
  }
  if (
    stringValue(
      stateRow,
      "user_name",
      "dispatcher_postgres_schema_admission_user_state_invalid",
    ) !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1
  ) {
    fail("dispatcher_postgres_schema_admission_user_identity_mismatch");
  }
  if (
    stringValue(
      stateRow,
      "database_owner",
      "dispatcher_postgres_schema_admission_database_owner_state_invalid",
    ) !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1
  ) {
    fail("dispatcher_postgres_schema_admission_database_owner_mismatch");
  }
  const publicSchemaOwner = stringValue(
    stateRow,
    "public_schema_owner",
    "dispatcher_postgres_schema_admission_public_schema_owner_state_invalid",
  );
  if (
    publicSchemaOwner !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1 &&
    publicSchemaOwner !== "pg_database_owner"
  ) {
    fail("dispatcher_postgres_schema_admission_public_schema_owner_mismatch");
  }
  if (
    numberValue(
      stateRow,
      "public_schema_nonowner_create_grants",
      "dispatcher_postgres_schema_admission_public_schema_acl_state_invalid",
    ) !== 0
  ) {
    fail("dispatcher_postgres_schema_admission_public_schema_create_grant_present");
  }
  if (
    !exactArray(
      stringArrayValue(
        stateRow,
        "effective_search_path",
        "dispatcher_postgres_schema_admission_search_path_state_invalid",
      ),
      ["pg_catalog", "public"],
    )
  ) {
    fail("dispatcher_postgres_schema_admission_search_path_mismatch");
  }
  if (
    stringValue(
      stateRow,
      "temp_schema_oid",
      "dispatcher_postgres_schema_admission_temp_schema_state_invalid",
    ) !== "0"
  ) {
    fail("dispatcher_postgres_schema_admission_temp_schema_present");
  }
  if (
    stringValue(
      stateRow,
      "transaction_read_only",
      "dispatcher_postgres_schema_admission_transaction_state_invalid",
    ) !== "on"
  ) {
    fail("dispatcher_postgres_schema_admission_transaction_not_read_only");
  }

  const relations = await client.query(RELATIONS_SQL);
  const actualRelations = relations.rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    return stringValue(
      row,
      "table_name",
      "dispatcher_postgres_schema_admission_relation_row_invalid",
    );
  });
  if (!exactArray(actualRelations, EXPECTED_TABLE_NAMES)) {
    fail("dispatcher_postgres_schema_admission_relation_set_mismatch", {
      expected_count: EXPECTED_TABLE_NAMES.length,
      actual_count: actualRelations.length,
    });
  }
  for (const raw of relations.rows) {
    const row = raw as Record<string, unknown>;
    if (
      stringValue(
        row,
        "relkind",
        "dispatcher_postgres_schema_admission_relation_row_invalid",
      ) !== "r" ||
      stringValue(
        row,
        "persistence",
        "dispatcher_postgres_schema_admission_relation_row_invalid",
      ) !== "p" ||
      booleanValue(
        row,
        "is_partition",
        "dispatcher_postgres_schema_admission_relation_row_invalid",
      ) ||
      numberValue(
        row,
        "inheritance_parent_count",
        "dispatcher_postgres_schema_admission_relation_row_invalid",
      ) !== 0 ||
      numberValue(
        row,
        "inheritance_child_count",
        "dispatcher_postgres_schema_admission_relation_row_invalid",
      ) !== 0 ||
      stringValue(
        row,
        "table_owner",
        "dispatcher_postgres_schema_admission_relation_row_invalid",
      ) !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1 ||
      numberValue(
        row,
        "nonowner_acl_count",
        "dispatcher_postgres_schema_admission_relation_row_invalid",
      ) !== 0 ||
      booleanValue(
        row,
        "row_security",
        "dispatcher_postgres_schema_admission_relation_row_invalid",
      ) ||
      booleanValue(
        row,
        "force_row_security",
        "dispatcher_postgres_schema_admission_relation_row_invalid",
      )
    ) {
      fail("dispatcher_postgres_schema_admission_relation_policy_mismatch", {
        table: stringValue(
          row,
          "table_name",
          "dispatcher_postgres_schema_admission_relation_row_invalid",
        ),
      });
    }
  }

  const columns = await client.query(COLUMNS_SQL, [EXPECTED_TABLE_NAMES]);
  const byTable = new Map<string, Record<string, unknown>[]>();
  for (const raw of columns.rows) {
    const row = raw as Record<string, unknown>;
    const table = stringValue(
      row,
      "table_name",
      "dispatcher_postgres_schema_admission_column_row_invalid",
    );
    const list = byTable.get(table) || [];
    list.push(row);
    byTable.set(table, list);
  }

  for (const table of EXPECTED_TABLE_NAMES) {
    const expected = EXPECTED_V1[table];
    const actual = byTable.get(table) || [];
    if (actual.length !== expected.columns.length) {
      fail("dispatcher_postgres_schema_admission_columns_mismatch", {
        table,
        expected_count: expected.columns.length,
        actual_count: actual.length,
      });
    }
    for (let index = 0; index < expected.columns.length; index += 1) {
      const want = expected.columns[index];
      const row = actual[index];
      const ordinal = numberValue(
        row,
        "ordinal_position",
        "dispatcher_postgres_schema_admission_column_row_invalid",
      );
      const defaultExpression = row.default_expression;
      if (
        ordinal !== index + 1 ||
        stringValue(
          row,
          "column_name",
          "dispatcher_postgres_schema_admission_column_row_invalid",
        ) !== want.name ||
        stringValue(
          row,
          "data_type",
          "dispatcher_postgres_schema_admission_column_row_invalid",
        ) !== want.type ||
        booleanValue(
          row,
          "not_null",
          "dispatcher_postgres_schema_admission_column_row_invalid",
        ) !== want.not_null ||
        stringValue(
          row,
          "identity_kind",
          "dispatcher_postgres_schema_admission_column_row_invalid",
        ) !== "" ||
        stringValue(
          row,
          "generated_kind",
          "dispatcher_postgres_schema_admission_column_row_invalid",
        ) !== "" ||
        (defaultExpression !== null && defaultExpression !== undefined)
      ) {
        fail("dispatcher_postgres_schema_admission_column_shape_mismatch", {
          table,
          ordinal: index + 1,
        });
      }
    }
  }

  const constraints = await client.query(CONSTRAINTS_SQL, [EXPECTED_TABLE_NAMES]);
  const constraintRows = new Map<string, Record<string, unknown>[]>();
  for (const raw of constraints.rows) {
    const row = raw as Record<string, unknown>;
    const table = stringValue(
      row,
      "table_name",
      "dispatcher_postgres_schema_admission_constraint_row_invalid",
    );
    const list = constraintRows.get(table) || [];
    list.push(row);
    constraintRows.set(table, list);
  }

  for (const table of EXPECTED_TABLE_NAMES) {
    const expected = EXPECTED_V1[table];
    const actual = constraintRows.get(table) || [];
    const primary = actual.filter(
      (row) =>
        stringValue(
          row,
          "constraint_type",
          "dispatcher_postgres_schema_admission_constraint_row_invalid",
        ) === "p",
    );
    const checks = actual.filter(
      (row) =>
        stringValue(
          row,
          "constraint_type",
          "dispatcher_postgres_schema_admission_constraint_row_invalid",
        ) === "c",
    );
    if (
      actual.length !== expected.check_count + 1 ||
      primary.length !== 1 ||
      checks.length !== expected.check_count
    ) {
      fail("dispatcher_postgres_schema_admission_constraint_count_mismatch", {
        table,
        expected_count: expected.check_count + 1,
        actual_count: actual.length,
      });
    }
    for (const row of actual) {
      if (
        booleanValue(
          row,
          "is_validated",
          "dispatcher_postgres_schema_admission_constraint_row_invalid",
        ) !== true ||
        booleanValue(
          row,
          "is_deferrable",
          "dispatcher_postgres_schema_admission_constraint_row_invalid",
        ) !== false ||
        booleanValue(
          row,
          "is_initially_deferred",
          "dispatcher_postgres_schema_admission_constraint_row_invalid",
        ) !== false
      ) {
        fail("dispatcher_postgres_schema_admission_constraint_policy_mismatch", {
          table,
        });
      }
    }

    for (const row of checks) {
      if (
        booleanValue(
          row,
          "is_no_inherit",
          "dispatcher_postgres_schema_admission_constraint_row_invalid",
        ) !== false
      ) {
        fail("dispatcher_postgres_schema_admission_constraint_policy_mismatch", {
          table,
        });
      }
    }

    const primaryColumns = Array.isArray(primary[0].key_columns)
      ? (primary[0].key_columns as unknown[]).map(String)
      : [];
    if (!exactArray(primaryColumns, expected.primary_key)) {
      fail("dispatcher_postgres_schema_admission_primary_key_mismatch", {
        table,
      });
    }

    const canonicalChecks = checks
      .map((row) => canonicalConstraint(row.definition))
      .sort();
    const exactExpectedChecks =
      (EXPECTED_CHECK_DEFINITIONS_V1[table] || [])
        .map((definition) => canonicalConstraint(definition))
        .sort();
    if (!exactArray(canonicalChecks, exactExpectedChecks)) {
      fail("dispatcher_postgres_schema_admission_check_definition_mismatch", {
        table,
        expected_count: exactExpectedChecks.length,
        actual_count: canonicalChecks.length,
      });
    }

    const checkText = canonicalChecks.join("|");
    const semanticCheckText = checkText.toLowerCase();
    for (const token of expected.required_check_tokens) {
      if (!semanticCheckText.includes(token.toLowerCase())) {
        fail("dispatcher_postgres_schema_admission_check_semantics_mismatch", {
          table,
        });
      }
    }
  }

  const indexes = await client.query(INDEXES_SQL, [EXPECTED_TABLE_NAMES]);
  const indexesByTable = new Map<string, Record<string, unknown>[]>();
  for (const raw of indexes.rows) {
    const row = raw as Record<string, unknown>;
    const table = stringValue(
      row,
      "table_name",
      "dispatcher_postgres_schema_admission_index_row_invalid",
    );
    const list = indexesByTable.get(table) || [];
    list.push(row);
    indexesByTable.set(table, list);
  }
  for (const table of EXPECTED_TABLE_NAMES) {
    const actual = indexesByTable.get(table) || [];
    if (actual.length !== 1) {
      fail("dispatcher_postgres_schema_admission_index_set_mismatch", {
        table,
        expected_count: 1,
        actual_count: actual.length,
      });
    }
    const row = actual[0];
    if (
      stringValue(
        row,
        "access_method",
        "dispatcher_postgres_schema_admission_index_row_invalid",
      ) !== "btree" ||
      numberValue(
        row,
        "key_attribute_count",
        "dispatcher_postgres_schema_admission_index_row_invalid",
      ) !== EXPECTED_V1[table].primary_key.length ||
      numberValue(
        row,
        "total_attribute_count",
        "dispatcher_postgres_schema_admission_index_row_invalid",
      ) !== EXPECTED_V1[table].primary_key.length
    ) {
      fail("dispatcher_postgres_schema_admission_index_policy_mismatch", {
        table,
      });
    }
    for (const key of [
      "is_primary",
      "is_unique",
      "is_valid",
      "is_ready",
      "no_predicate",
      "no_expressions",
    ]) {
      if (
        booleanValue(
          row,
          key,
          "dispatcher_postgres_schema_admission_index_row_invalid",
        ) !== true
      ) {
        fail("dispatcher_postgres_schema_admission_index_policy_mismatch", {
          table,
        });
      }
    }
  }

  const triggers = await client.query(TRIGGERS_SQL, [EXPECTED_TABLE_NAMES]);
  if (triggers.rows.length !== 0) {
    fail("dispatcher_postgres_schema_admission_trigger_present", {
      actual_count: triggers.rows.length,
    });
  }

  const canonicalSnapshot = JSON.stringify({
    relations: relations.rows,
    columns: columns.rows,
    constraints: constraints.rows,
    indexes: indexes.rows,
    triggers: triggers.rows,
  });
  return {
    fingerprint: crypto
      .createHash("sha256")
      .update(canonicalSnapshot, "utf8")
      .digest("hex"),
  };
}

export async function admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(
  factory: unknown,
): Promise<BuyVoidPaymentKeyedDispatcherPostgresSchemaAdmissionDecisionV1> {
  let schemaQueryPerformed = false;
  try {
    assertFactory(factory);
  } catch (error) {
    if (error instanceof SchemaAdmissionHoldV1) {
      return hold(error.reason, false, error.detail);
    }
    return hold("dispatcher_postgres_schema_admission_factory_invalid", false);
  }

  const admitted =
    factory as BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1;
  let client: BuyVoidPaymentKeyedDispatcherPostgresClientV1 | null = null;
  let transactionOpen = false;
  let releaseError: Error | boolean | undefined;

  try {
    client = await admitted.pool.connect();
    if (
      !client ||
      typeof client.query !== "function" ||
      typeof client.release !== "function"
    ) {
      return hold("dispatcher_postgres_schema_admission_client_invalid", false);
    }

    schemaQueryPerformed = true;
    await client.query(
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    transactionOpen = true;
    await client.query("SET LOCAL statement_timeout = '5000ms'");
    const inspected = await inspect(client);
    await client.query("COMMIT");
    transactionOpen = false;

    return {
      ok: true,
      marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1,
      version: 1,
      status: "schema_admitted",
      configuration_fingerprint_sha256:
        admitted.configuration_fingerprint_sha256,
      schema_fingerprint_sha256: inspected.fingerprint,
      schema_contract_tables: EXPECTED_TABLE_NAMES,
      schema_query_performed: true,
      database_mutation_performed: false,
      authority:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1,
    };
  } catch (error) {
    if (transactionOpen && client) {
      try {
        await client.query("ROLLBACK");
        transactionOpen = false;
      } catch {
        releaseError = true;
      }
    }
    if (error instanceof SchemaAdmissionHoldV1) {
      return hold(error.reason, schemaQueryPerformed, error.detail);
    }
    const code = safeErrorCode(error);
    return hold(
      "dispatcher_postgres_schema_admission_query_failed",
      schemaQueryPerformed,
      code ? { error_code: code } : undefined,
    );
  } finally {
    if (client) {
      try {
        client.release(releaseError);
      } catch {
        // Release failure cannot turn a HOLD into success.
      }
    }
  }
}
