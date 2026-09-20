import crypto from "node:crypto";
import path from "node:path";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1 =
  "buy-void-dispatcher-postgres-password-v1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1 =
  "buy-void-dispatcher-postgres-ca-v1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1 =
  "buy-void-payment-keyed-dispatcher-postgres-v1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1 =
  "void-node-buy-void-dispatcher-v1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1 =
  "void_buy_void_dispatcher_v1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1 =
  "void_buy_void_dispatcher_v1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    pure_configuration_validation_only: true,
    process_environment_read: false,
    filesystem_read: false,
    filesystem_write: false,
    credential_read: false,
    network_connect: false,
    database_query: false,
    schema_mutation: false,
    runtime_route_mount: false,
    service_mutation: false,
    package_pg_dependency_added: false,
    production_connection_factory_present: false,
    loopback_transport_only: true,
    tls_required: true,
    tls_certificate_verification_required: true,
    fixed_password_credential_id: true,
    fixed_ca_credential_id: true,
    fixed_database_identity: true,
    fixed_database_user_identity: true,
    fixed_application_name: true,
    libpq_environment_fallback_forbidden: true,
    explicit_schema_contract_required: true,
    bounded_pool_required: true,
    bounded_connection_timeout_required: true,
    bounded_idle_timeout_required: true,
    automatic_schema_migration: false,
    transaction_broadcast: false,
    wallet_access: false,
    signing: false,
    money_movement: false,
  } as const);

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_KEYS_V1 =
  Object.freeze([
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_DATABASE",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_USER",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_APPLICATION_NAME",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_SCHEMA_CONTRACT",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_SSL_MODE",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_TLS_SERVER_NAME",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID",
    "VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID",
    "CREDENTIALS_DIRECTORY",
  ] as const);

type KeyV1 =
  typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_KEYS_V1[number];

type CandidateV1 = Record<KeyV1, string>;

export type BuyVoidPaymentKeyedDispatcherPostgresProductionConfigReadyV1 = {
  ok: true;
  status: "candidate_verified";
  marker:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1;
  version: 1;
  configuration_fingerprint_sha256: string;
  host: "127.0.0.1" | "::1";
  port: number;
  database: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1;
  user: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1;
  application_name:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1;
  schema_contract:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1;
  ssl_mode: "verify-full";
  tls_server_name: "localhost";
  pool_max: number;
  connection_timeout_ms: number;
  idle_timeout_ms: number;
  credentials_directory: string;
  password_credential_id:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1;
  ca_credential_id:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1;
  connection_factory_ready: false;
  schema_admission_ready: false;
  production_connection_performed: false;
  credential_read_performed: false;
  authority:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_AUTHORITY_V1;
};

export type BuyVoidPaymentKeyedDispatcherPostgresProductionConfigHeldV1 = {
  ok: false;
  status: "held";
  marker:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1;
  version: 1;
  reason: string;
  detail?: Record<string, unknown>;
  connection_factory_ready: false;
  schema_admission_ready: false;
  production_connection_performed: false;
  credential_read_performed: false;
  authority:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_AUTHORITY_V1;
};

export type BuyVoidPaymentKeyedDispatcherPostgresProductionConfigDecisionV1 =
  | BuyVoidPaymentKeyedDispatcherPostgresProductionConfigReadyV1
  | BuyVoidPaymentKeyedDispatcherPostgresProductionConfigHeldV1;

const KEY_SET = new Set<string>(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_KEYS_V1,
);

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidPaymentKeyedDispatcherPostgresProductionConfigHeldV1 {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1,
    version: 1,
    reason,
    ...(detail ? { detail } : {}),
    connection_factory_ready: false,
    schema_admission_ready: false,
    production_connection_performed: false,
    credential_read_performed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_AUTHORITY_V1,
  };
}

function direct(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function strict(value: unknown): CandidateV1 | null {
  const record = direct(value);
  if (!record) return null;
  try {
    const keys = Reflect.ownKeys(record);
    if (
      keys.length !==
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_KEYS_V1.length ||
      keys.some((key) => typeof key !== "string" || !KEY_SET.has(key))
    ) return null;

    const descriptors = Object.getOwnPropertyDescriptors(record);
    const copy: Record<string, string> = {};
    for (const key of VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_KEYS_V1) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, "value") ||
        descriptor.enumerable !== true ||
        typeof descriptor.value !== "string" ||
        !descriptor.value ||
        descriptor.value !== descriptor.value.trim() ||
        descriptor.value.includes("\0")
      ) return null;
      copy[key] = descriptor.value;
    }
    return Object.freeze(copy) as CandidateV1;
  } catch {
    return null;
  }
}

function boundedInt(
  name: string,
  raw: string,
  min: number,
  max: number,
): number | BuyVoidPaymentKeyedDispatcherPostgresProductionConfigHeldV1 {
  if (!/^(?:0|[1-9][0-9]*)$/.test(raw)) return held(name + "_invalid");
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    return held(name + "_out_of_bounds", { min, max });
  }
  return value;
}

function credentialsDirectory(raw: string): string {
  if (!path.isAbsolute(raw)) return "";
  const normalized = path.normalize(raw);
  const credentialRoot = path.normalize("/run/credentials");
  const relative = path.relative(credentialRoot, normalized);
  if (
    normalized === path.parse(normalized).root ||
    normalized === credentialRoot ||
    !relative ||
    relative === ".." ||
    relative.startsWith("../") ||
    path.isAbsolute(relative)
  ) return "";
  return normalized;
}

export function verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1(
  input: unknown,
): BuyVoidPaymentKeyedDispatcherPostgresProductionConfigDecisionV1 {
  const candidate = strict(input);
  if (!candidate) {
    const record = direct(input);
    if (record) {
      const unknown = Object.keys(record).find((key) => !KEY_SET.has(key));
      if (unknown) {
        return held("dispatcher_postgres_production_config_unknown_key", {
          key: unknown,
        });
      }
      const missing =
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_KEYS_V1
          .filter((key) => !Object.hasOwn(record, key));
      if (missing.length) {
        return held("dispatcher_postgres_production_config_missing_key", {
          keys: missing,
        });
      }
    }
    return held("dispatcher_postgres_production_config_shape_invalid");
  }

  const host = candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST;
  if (host !== "127.0.0.1" && host !== "::1") {
    return held("dispatcher_postgres_host_not_loopback");
  }

  const port =
    boundedInt(
      "dispatcher_postgres_port",
      candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT,
      1,
      65_535,
    );
  if (typeof port !== "number") return port;

  if (
    candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_DATABASE !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1
  ) return held("dispatcher_postgres_database_identity_mismatch");

  if (
    candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_USER !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1
  ) return held("dispatcher_postgres_user_identity_mismatch");

  if (
    candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_APPLICATION_NAME !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1
  ) return held("dispatcher_postgres_application_name_mismatch");

  if (
    candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_SCHEMA_CONTRACT !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1
  ) return held("dispatcher_postgres_schema_contract_mismatch");

  if (candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_SSL_MODE !== "verify-full") {
    return held("dispatcher_postgres_tls_verification_required");
  }

  if (
    candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_TLS_SERVER_NAME !==
      "localhost"
  ) return held("dispatcher_postgres_tls_server_name_mismatch");

  const poolMax =
    boundedInt(
      "dispatcher_postgres_pool_max",
      candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX,
      1,
      16,
    );
  if (typeof poolMax !== "number") return poolMax;

  const connectionTimeout =
    boundedInt(
      "dispatcher_postgres_connection_timeout_ms",
      candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS,
      100,
      10_000,
    );
  if (typeof connectionTimeout !== "number") return connectionTimeout;

  const idleTimeout =
    boundedInt(
      "dispatcher_postgres_idle_timeout_ms",
      candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS,
      1_000,
      60_000,
    );
  if (typeof idleTimeout !== "number") return idleTimeout;

  if (
    candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1
  ) return held("dispatcher_postgres_password_credential_id_mismatch");

  if (
    candidate.VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1
  ) return held("dispatcher_postgres_ca_credential_id_mismatch");

  const credentials =
    credentialsDirectory(candidate.CREDENTIALS_DIRECTORY);
  if (!credentials) {
    return held("dispatcher_postgres_credentials_directory_invalid");
  }

  const fingerprint = sha256([
    "marker=" +
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1,
    "version=1",
    "host=" + host,
    "port=" + String(port),
    "database=" + VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
    "user=" + VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
    "application_name=" +
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
    "schema_contract=" +
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1,
    "ssl_mode=verify-full",
    "tls_server_name=localhost",
    "pool_max=" + String(poolMax),
    "connection_timeout_ms=" + String(connectionTimeout),
    "idle_timeout_ms=" + String(idleTimeout),
    "credentials_directory_sha256=" + sha256(credentials),
    "password_credential_id=" +
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
    "ca_credential_id=" +
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  ].join("\n"));

  return {
    ok: true,
    status: "candidate_verified",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1,
    version: 1,
    configuration_fingerprint_sha256: fingerprint,
    host,
    port,
    database:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
    user:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
    application_name:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
    schema_contract:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1,
    ssl_mode: "verify-full",
    tls_server_name: "localhost",
    pool_max: poolMax,
    connection_timeout_ms: connectionTimeout,
    idle_timeout_ms: idleTimeout,
    credentials_directory: credentials,
    password_credential_id:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
    ca_credential_id:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
    connection_factory_ready: false,
    schema_admission_ready: false,
    production_connection_performed: false,
    credential_read_performed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_AUTHORITY_V1,
  };
}
