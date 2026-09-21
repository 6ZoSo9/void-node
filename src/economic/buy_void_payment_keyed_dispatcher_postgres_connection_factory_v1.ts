import { X509Certificate } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";
import { TextDecoder } from "node:util";

import {
  Pool,
  type PoolConfig,
} from "pg";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1,
  type BuyVoidPaymentKeyedDispatcherPostgresProductionConfigReadyV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_production_config_v1.js";
import type {
  BuyVoidPaymentKeyedDispatcherPostgresClientV1,
  BuyVoidPaymentKeyedDispatcherPostgresPoolV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_store_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1 =
  Object.freeze({
    source_only_factory: true,
    production_connection_factory_present: true,
    accepted_configuration_verifier_required: true,
    explicit_candidate_input_required: true,
    process_environment_read: false,
    connection_string_allowed: false,
    libpq_environment_fallback_allowed: false,
    systemd_credential_only: true,
    credential_directory_descriptor_pinned: true,
    credential_leaf_nofollow: true,
    credential_regular_file_required: true,
    credential_owner_required: true,
    group_or_world_access_allowed: false,
    owner_write_access_allowed: false,
    credential_file_mode: "0400",
    bounded_credential_reads: true,
    password_callback_used: true,
    raw_password_output: false,
    raw_ca_output: false,
    credential_buffers_zeroed_on_close: true,
    credential_single_owned_buffer_read: true,
    tls_required: true,
    tls_certificate_verification_required: true,
    tls_minimum_version: "TLSv1.2",
    tls_negotiation: "postgres",
    channel_binding_enabled: true,
    pipeline_enabled: false,
    pool_construction_connects: false,
    network_connect_when_pool_connect_called: true,
    automatic_schema_migration: false,
    schema_query_on_factory_creation: false,
    runtime_route_mount: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
  } as const);

const CREDENTIAL_ROOT_V1 = "/run/credentials";
const PROC_FD_ROOT_V1 = "/proc/self/fd";
const PASSWORD_MAX_BYTES_V1 = 4 * 1024;
const CA_MAX_BYTES_V1 = 512 * 1024;

class PostgresConnectionFactoryErrorV1 extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "PostgresConnectionFactoryErrorV1";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new PostgresConnectionFactoryErrorV1(code);
}

function safeErrorClass(error: unknown): string {
  const raw = String((error as { name?: unknown } | null)?.name || "Error");
  return /^[A-Za-z0-9._:-]{1,80}$/.test(raw) ? raw : "Error";
}

function safeErrorCode(error: unknown): string | null {
  const raw = String((error as { code?: unknown } | null)?.code || "");
  return /^[A-Za-z0-9._:-]{1,40}$/.test(raw) ? raw : null;
}

function currentUid(): number | null {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

function noFollowFlag(): number {
  const value = Number((fs.constants as any).O_NOFOLLOW || 0);
  if (!Number.isInteger(value) || value === 0) {
    fail("dispatcher_postgres_credential_nofollow_unavailable");
  }
  return value;
}

function directoryFlag(): number {
  const value = Number((fs.constants as any).O_DIRECTORY || 0);
  if (!Number.isInteger(value) || value === 0) {
    fail("dispatcher_postgres_credential_directory_flag_unavailable");
  }
  return value;
}

function fdPath(parentFd: number, child: string): string {
  if (
    !Number.isInteger(parentFd) ||
    parentFd < 0 ||
    !child ||
    child === "." ||
    child === ".." ||
    path.basename(child) !== child
  ) {
    fail("dispatcher_postgres_credential_path_invalid");
  }
  return path.join(PROC_FD_ROOT_V1, String(parentFd), child);
}

function requirePrivateDirectoryStat(stat: fs.Stats): void {
  if (!stat.isDirectory()) {
    fail("dispatcher_postgres_credentials_directory_not_directory");
  }
  const uid = currentUid();
  if (uid !== null && stat.uid !== uid) {
    fail("dispatcher_postgres_credentials_directory_owner_mismatch");
  }
  const mode = stat.mode & 0o777;
  if ((mode & 0o077) !== 0) {
    fail("dispatcher_postgres_credentials_directory_permissions_too_broad");
  }
}

function openCredentialDirectory(credentialsDirectory: string): number {
  if (process.platform !== "linux") {
    fail("dispatcher_postgres_credentials_linux_required");
  }
  const normalized = path.normalize(credentialsDirectory);
  const relative = path.relative(CREDENTIAL_ROOT_V1, normalized);
  const parts = relative.split(path.sep).filter(Boolean);
  if (
    !path.isAbsolute(normalized) ||
    !relative ||
    relative === ".." ||
    relative.startsWith("../") ||
    path.isAbsolute(relative) ||
    parts.length === 0
  ) {
    fail("dispatcher_postgres_credentials_directory_invalid");
  }

  const flags =
    fs.constants.O_RDONLY |
    noFollowFlag() |
    directoryFlag();

  let currentFd: number;
  try {
    currentFd = fs.openSync(CREDENTIAL_ROOT_V1, flags);
  } catch (error) {
    if (safeErrorCode(error) === "ELOOP") {
      fail("dispatcher_postgres_credentials_root_symlink_forbidden");
    }
    fail("dispatcher_postgres_credentials_root_unavailable");
  }

  try {
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      let nextFd: number;
      try {
        nextFd = fs.openSync(fdPath(currentFd, part), flags);
      } catch (error) {
        if (safeErrorCode(error) === "ELOOP") {
          fail("dispatcher_postgres_credentials_directory_symlink_forbidden");
        }
        fail("dispatcher_postgres_credentials_directory_unavailable");
      }

      fs.closeSync(currentFd);
      currentFd = nextFd;
      requirePrivateDirectoryStat(fs.fstatSync(currentFd));
    }
    return currentFd;
  } catch (error) {
    try {
      fs.closeSync(currentFd);
    } catch {
      // The original fail-closed error remains authoritative.
    }
    throw error;
  }
}

type FileStampV1 = {
  dev: string;
  ino: string;
  size: string;
  uid: string;
  mode: number;
  mtime_ns: string;
  ctime_ns: string;
};

function fileStamp(stat: any): FileStampV1 {
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: String(stat.size),
    uid: String(stat.uid),
    mode: Number(stat.mode) & 0o777,
    mtime_ns: String(stat.mtimeNs),
    ctime_ns: String(stat.ctimeNs),
  };
}

function sameStamp(a: FileStampV1, b: FileStampV1): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.uid === b.uid &&
    a.mode === b.mode &&
    a.mtime_ns === b.mtime_ns &&
    a.ctime_ns === b.ctime_ns
  );
}

function readCredential(
  directoryFd: number,
  credentialId: string,
  label: "password" | "ca",
  maxBytes: number,
): Buffer {
  const flags = fs.constants.O_RDONLY | noFollowFlag();
  let fd: number;
  try {
    fd = fs.openSync(fdPath(directoryFd, credentialId), flags);
  } catch (error) {
    if (safeErrorCode(error) === "ELOOP") {
      fail("dispatcher_postgres_" + label + "_credential_symlink_forbidden");
    }
    fail("dispatcher_postgres_" + label + "_credential_unavailable");
  }

  try {
    const before: any = fs.fstatSync(fd, { bigint: true } as any);
    if (!before.isFile()) {
      fail("dispatcher_postgres_" + label + "_credential_not_regular_file");
    }
    const uid = currentUid();
    if (uid !== null && Number(before.uid) !== uid) {
      fail("dispatcher_postgres_" + label + "_credential_owner_mismatch");
    }
    const mode = Number(before.mode) & 0o777;
    if (mode !== 0o400) {
      fail("dispatcher_postgres_" + label + "_credential_mode_not_0400");
    }
    const size = Number(before.size);
    if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes) {
      fail("dispatcher_postgres_" + label + "_credential_size_out_of_policy");
    }

    let owned: Buffer | null = null;
    try {
      owned = Buffer.alloc(size);
      let offset = 0;
      while (offset < size) {
        const read = fs.readSync(fd, owned, offset, size - offset, null);
        if (read === 0) {
          fail(
            "dispatcher_postgres_" +
              label +
              "_credential_changed_during_read",
          );
        }
        offset += read;
      }

      const after: any = fs.fstatSync(fd, { bigint: true } as any);
      if (!sameStamp(fileStamp(before), fileStamp(after))) {
        fail(
          "dispatcher_postgres_" +
            label +
            "_credential_changed_during_read",
        );
      }

      const result = owned;
      owned = null;
      return result;
    } finally {
      owned?.fill(0);
    }
  } finally {
    fs.closeSync(fd);
  }
}

function decodeUtf8Exact(bytes: Buffer, code: string): string {
  let value: string;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(code);
  }
  if (!Buffer.from(value, "utf8").equals(bytes)) {
    fail(code);
  }
  return value;
}

function validatePassword(bytes: Buffer): void {
  const value = decodeUtf8Exact(
    bytes,
    "dispatcher_postgres_password_credential_utf8_invalid",
  );
  if (
    value.length === 0 ||
    value.includes("\0") ||
    value.includes("\r") ||
    value.includes("\n")
  ) {
    fail("dispatcher_postgres_password_credential_shape_invalid");
  }
}

function validateCa(bytes: Buffer): void {
  const value = decodeUtf8Exact(
    bytes,
    "dispatcher_postgres_ca_credential_utf8_invalid",
  );
  if (
    /-----BEGIN (?:ENCRYPTED |RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value)
  ) {
    fail("dispatcher_postgres_ca_credential_shape_invalid");
  }

  const certificatePattern =
    /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
  const certificates = value.match(certificatePattern) || [];
  const remainder = value.replace(certificatePattern, "");
  if (certificates.length === 0 || remainder.trim().length !== 0) {
    fail("dispatcher_postgres_ca_credential_shape_invalid");
  }

  try {
    for (const certificate of certificates) {
      new X509Certificate(certificate);
    }
    tls.createSecureContext({
      ca: bytes,
      minVersion: "TLSv1.2",
    });
  } catch {
    fail("dispatcher_postgres_ca_credential_parse_invalid");
  }
}

type ExplicitPoolConfigV1 = PoolConfig & {
  sslnegotiation: "postgres";
  pipeline: false;
  enableChannelBinding: true;
  password: () => string;
  replication: "false";
  ssl: tls.ConnectionOptions;
};

export type BuyVoidPaymentKeyedDispatcherPostgresConnectionPolicyV1 = {
  host: "127.0.0.1" | "::1";
  port: number;
  database: string;
  user: string;
  application_name: string;
  pool_max: number;
  connection_timeout_ms: number;
  idle_timeout_ms: number;
  ssl_mode: "verify-full";
  tls_server_name: "localhost";
  tls_minimum_version: "TLSv1.2";
  ssl_negotiation: "postgres";
  channel_binding_enabled: true;
  pipeline_enabled: false;
  client_encoding: "UTF8";
  startup_options: "-c client_encoding=UTF8";
  replication_mode: "false";
  connection_string_used: false;
  ambient_libpq_fallback: false;
};

export type BuyVoidPaymentKeyedDispatcherPostgresPoolErrorSnapshotV1 = {
  count: number;
  last_error_class: string | null;
  last_error_code: string | null;
};

export type BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1 = {
  ok: true;
  marker:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1;
  version: 1;
  status: "ready";
  configuration_fingerprint_sha256: string;
  connection_policy: BuyVoidPaymentKeyedDispatcherPostgresConnectionPolicyV1;
  pool: BuyVoidPaymentKeyedDispatcherPostgresPoolV1;
  close: () => Promise<void>;
  pool_error_snapshot:
    () => BuyVoidPaymentKeyedDispatcherPostgresPoolErrorSnapshotV1;
  credential_read_performed: true;
  network_connect_performed: false;
  schema_query_performed: false;
  authority:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1;
};

export type BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryHeldV1 = {
  ok: false;
  marker:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1;
  version: 1;
  status: "held";
  reason: string;
  detail?: Record<string, unknown>;
  credential_read_performed: boolean;
  network_connect_performed: false;
  schema_query_performed: false;
  authority:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1;
};

export type BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryDecisionV1 =
  | BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1
  | BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryHeldV1;

function held(
  reason: string,
  credentialReadPerformed: boolean,
  detail?: Record<string, unknown>,
): BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryHeldV1 {
  return {
    ok: false,
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1,
    version: 1,
    status: "held",
    reason,
    ...(detail ? { detail } : {}),
    credential_read_performed: credentialReadPerformed,
    network_connect_performed: false,
    schema_query_performed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1,
  };
}

function connectionPolicy(
  config: BuyVoidPaymentKeyedDispatcherPostgresProductionConfigReadyV1,
): BuyVoidPaymentKeyedDispatcherPostgresConnectionPolicyV1 {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    application_name: config.application_name,
    pool_max: config.pool_max,
    connection_timeout_ms: config.connection_timeout_ms,
    idle_timeout_ms: config.idle_timeout_ms,
    ssl_mode: "verify-full",
    tls_server_name: "localhost",
    tls_minimum_version: "TLSv1.2",
    ssl_negotiation: "postgres",
    channel_binding_enabled: true,
    pipeline_enabled: false,
    client_encoding: "UTF8",
    startup_options: "-c client_encoding=UTF8",
    replication_mode: "false",
    connection_string_used: false,
    ambient_libpq_fallback: false,
  };
}

export function createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(
  input: unknown,
): BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryDecisionV1 {
  const verified =
    verifyBuyVoidPaymentKeyedDispatcherPostgresProductionConfigV1(input);
  if (verified.ok === false) {
    return held(
      "dispatcher_postgres_connection_factory_configuration_held",
      false,
      { configuration_reason: verified.reason },
    );
  }

  let directoryFd: number | null = null;
  let passwordBytes: Buffer | null = null;
  let caBytes: Buffer | null = null;
  try {
    directoryFd = openCredentialDirectory(verified.credentials_directory);
    passwordBytes = readCredential(
      directoryFd,
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
      "password",
      PASSWORD_MAX_BYTES_V1,
    );
    caBytes = readCredential(
      directoryFd,
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
      "ca",
      CA_MAX_BYTES_V1,
    );
  } catch (error) {
    passwordBytes?.fill(0);
    caBytes?.fill(0);
    if (error instanceof PostgresConnectionFactoryErrorV1) {
      return held(error.code, true);
    }
    return held(
      "dispatcher_postgres_credential_read_failed",
      true,
      { error_class: safeErrorClass(error) },
    );
  } finally {
    if (directoryFd !== null) {
      try {
        fs.closeSync(directoryFd);
      } catch {
        // Credential bytes have already been detached from the directory fd.
      }
    }
  }

  if (passwordBytes === null || caBytes === null) {
    return held(
      "dispatcher_postgres_credential_material_missing",
      true,
    );
  }

  try {
    validatePassword(passwordBytes);
    validateCa(caBytes);
  } catch (error) {
    passwordBytes.fill(0);
    caBytes.fill(0);
    if (error instanceof PostgresConnectionFactoryErrorV1) {
      return held(error.code, true);
    }
    return held(
      "dispatcher_postgres_credential_validation_failed",
      true,
      { error_class: safeErrorClass(error) },
    );
  }

  let closed = false;
  let poolErrorCount = 0;
  let lastPoolErrorClass: string | null = null;
  let lastPoolErrorCode: string | null = null;

  const passwordProvider = (): string => {
    if (closed || passwordBytes === null) {
      throw new Error("dispatcher_postgres_connection_factory_closed");
    }
    return decodeUtf8Exact(
      passwordBytes,
      "dispatcher_postgres_password_credential_utf8_invalid",
    );
  };

  const poolConfig: ExplicitPoolConfigV1 = {
    host: verified.host,
    port: verified.port,
    database: verified.database,
    user: verified.user,
    password: passwordProvider,
    application_name: verified.application_name,
    fallback_application_name: verified.application_name,
    options: "-c client_encoding=UTF8",
    replication: "false",
    client_encoding: "UTF8",
    ssl: {
      ca: caBytes,
      servername: verified.tls_server_name,
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
    sslnegotiation: "postgres",
    enableChannelBinding: true,
    pipeline: false,
    connectionTimeoutMillis: verified.connection_timeout_ms,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    statement_timeout: 0,
    query_timeout: 0,
    lock_timeout: 0,
    idle_in_transaction_session_timeout: 0,
    max: verified.pool_max,
    min: 0,
    idleTimeoutMillis: verified.idle_timeout_ms,
    allowExitOnIdle: false,
    maxLifetimeSeconds: 0,
  };

  let pgPool: Pool;
  try {
    pgPool = new Pool(poolConfig);
  } catch (error) {
    passwordBytes.fill(0);
    caBytes.fill(0);
    return held(
      "dispatcher_postgres_pool_construction_failed",
      true,
      { error_class: safeErrorClass(error) },
    );
  }

  pgPool.on("error", (error: Error & { code?: unknown }) => {
    poolErrorCount += 1;
    lastPoolErrorClass = safeErrorClass(error);
    lastPoolErrorCode = safeErrorCode(error);
  });

  const narrowPool: BuyVoidPaymentKeyedDispatcherPostgresPoolV1 = {
    async connect(): Promise<BuyVoidPaymentKeyedDispatcherPostgresClientV1> {
      if (closed) {
        throw new Error("dispatcher_postgres_connection_factory_closed");
      }
      const client = await pgPool.connect();
      let released = false;
      return {
        async query(text, values) {
          if (released) {
            throw new Error("dispatcher_postgres_client_released");
          }
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
          if (released) {
            throw new Error("dispatcher_postgres_client_release_duplicate");
          }
          released = true;
          client.release(error);
        },
      };
    },
  };

  return {
    ok: true,
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1,
    version: 1,
    status: "ready",
    configuration_fingerprint_sha256:
      verified.configuration_fingerprint_sha256,
    connection_policy: connectionPolicy(verified),
    pool: narrowPool,
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      try {
        await pgPool.end();
      } finally {
        passwordBytes?.fill(0);
        caBytes?.fill(0);
        passwordBytes = null;
        caBytes = null;
      }
    },
    pool_error_snapshot() {
      return {
        count: poolErrorCount,
        last_error_class: lastPoolErrorClass,
        last_error_code: lastPoolErrorCode,
      };
    },
    credential_read_performed: true,
    network_connect_performed: false,
    schema_query_performed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1,
  };
}

export function buyVoidPaymentKeyedDispatcherPostgresConnectionFactoryDependencyContractV1() {
  return Object.freeze({
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1,
    pg_package: "pg",
    pg_version: "8.23.0",
    pg_types_package: "@types/pg",
    pg_types_version: "8.23.1",
    production_config_marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1,
    production_config_pure_validation:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_AUTHORITY_V1
        .pure_configuration_validation_only,
    connection_string_allowed: false,
    ambient_libpq_fallback_allowed: false,
  } as const);
}
