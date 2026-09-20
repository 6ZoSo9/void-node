#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1,
  buyVoidPaymentKeyedDispatcherPostgresConnectionFactoryDependencyContractV1,
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.js";

const credentialsDirectory = String(
  process.env.VOID_TEST_POSTGRES_CREDENTIALS_DIRECTORY || "",
).trim();
assert.match(credentialsDirectory, /^\/run\/credentials\//);

const passwordPath = path.join(
  credentialsDirectory,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
);
const caPath = path.join(
  credentialsDirectory,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
);
const originalPassword = fs.readFileSync(passwordPath);
const originalCa = fs.readFileSync(caPath);

function candidate(port: number, directory = credentialsDirectory) {
  return {
    VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST: "127.0.0.1",
    VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT: String(port),
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
    VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS: "1000",
    VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS: "5000",
    VOID_BUY_VOID_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
    CREDENTIALS_DIRECTORY: directory,
  };
}

async function closeIfReady(value: ReturnType<
  typeof createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1
>): Promise<void> {
  if (value.ok) await value.close();
}

async function expectHeld(
  label: string,
  value: ReturnType<
    typeof createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1
  >,
  reason: string | readonly string[],
): Promise<void> {
  try {
    assert.equal(value.ok, false, label);
    if (value.ok) throw new Error("expected held:" + label);
    if (typeof reason === "string") {
      assert.equal(value.reason, reason, label);
    } else {
      assert.ok(reason.includes(value.reason), label + ": " + value.reason);
    }
    assert.equal(value.network_connect_performed, false, label);
    assert.equal(value.schema_query_performed, false, label);
  } finally {
    await closeIfReady(value);
  }
}

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1,
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1",
);
const authority =
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1;
assert.equal(authority.production_connection_factory_present, true);
assert.equal(authority.process_environment_read, false);
assert.equal(authority.connection_string_allowed, false);
assert.equal(authority.libpq_environment_fallback_allowed, false);
assert.equal(authority.systemd_credential_only, true);
assert.equal(authority.credential_directory_descriptor_pinned, true);
assert.equal(authority.credential_leaf_nofollow, true);
assert.equal(authority.group_or_world_access_allowed, false);
assert.equal(authority.owner_write_access_allowed, false);
assert.equal(authority.credential_file_mode, "0400");
assert.equal(authority.pool_construction_connects, false);
assert.equal(authority.network_connect_when_pool_connect_called, true);
assert.equal(authority.automatic_schema_migration, false);
assert.equal(authority.runtime_route_mount, false);
assert.equal(authority.wallet_access, false);
assert.equal(authority.signing, false);
assert.equal(authority.transaction_broadcast, false);
assert.equal(authority.money_movement, false);

const dependency =
  buyVoidPaymentKeyedDispatcherPostgresConnectionFactoryDependencyContractV1();
assert.equal(dependency.pg_version, "8.23.0");
assert.equal(dependency.pg_types_version, "8.23.1");
assert.equal(dependency.connection_string_allowed, false);
assert.equal(dependency.ambient_libpq_fallback_allowed, false);

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts",
  ),
  "utf8",
);
for (const fragment of [
  "O_NOFOLLOW",
  "/proc/self/fd",
  "fstatSync",
  "readSync",
  "passwordProvider",
  'sslnegotiation: "postgres"',
  "enableChannelBinding: true",
  "pipeline: false",
  "rejectUnauthorized: true",
  'minVersion: "TLSv1.2"',
]) {
  assert.equal(source.includes(fragment), true, fragment);
}
for (const forbidden of [
  "process.env",
  "connectionString",
  "readFileSync(credential",
  "pg-native",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

const invalidConfig = createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1({
  ...candidate(5432),
  VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST: "10.0.0.8",
  CREDENTIALS_DIRECTORY: "/run/credentials/does-not-exist",
});
assert.equal(invalidConfig.ok, false);
if (!invalidConfig.ok) {
  assert.equal(
    invalidConfig.reason,
    "dispatcher_postgres_connection_factory_configuration_held",
  );
  assert.equal(invalidConfig.credential_read_performed, false);
  assert.equal(
    invalidConfig.detail?.configuration_reason,
    "dispatcher_postgres_host_not_loopback",
  );
}

let connectionCount = 0;
let firstPacketCaptured = false;
let resolveFirstPacket!: (packet: Buffer) => void;
const firstPacketPromise = new Promise<Buffer>((resolve) => {
  resolveFirstPacket = resolve;
});
const server = net.createServer((socket) => {
  connectionCount += 1;
  socket.once("data", (data) => {
    if (!firstPacketCaptured) {
      firstPacketCaptured = true;
      resolveFirstPacket(Buffer.from(data));
    }
    socket.destroy();
  });
});
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    server.off("error", reject);
    resolve();
  });
});
const address = server.address();
assert.ok(address && typeof address === "object");
const port = address.port;

const envKeys = [
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
  "PGAPPNAME",
  "PGSSLMODE",
  "PGSSLNEGOTIATION",
  "PGOPTIONS",
  "DATABASE_URL",
] as const;
const savedEnv = new Map<string, string | undefined>(
  envKeys.map((key) => [key, process.env[key]]),
);
Object.assign(process.env, {
  PGHOST: "203.0.113.99",
  PGPORT: "1",
  PGDATABASE: "attacker",
  PGUSER: "attacker",
  PGPASSWORD: "attacker",
  PGAPPNAME: "attacker",
  PGSSLMODE: "disable",
  PGSSLNEGOTIATION: "direct",
  PGOPTIONS: "-c search_path=attacker",
  DATABASE_URL: "postgresql://attacker:attacker@203.0.113.99:1/attacker",
});

let ready:
  | Extract<
      ReturnType<
        typeof createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1
      >,
      { ok: true }
    >
  | null = null;
try {
  const decision =
    createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(
      candidate(port),
    );
  if (decision.ok === false) throw new Error(decision.reason);
  assert.equal(decision.ok, true);
  ready = decision;

  assert.equal(decision.status, "ready");
  assert.equal(decision.credential_read_performed, true);
  assert.equal(decision.network_connect_performed, false);
  assert.equal(decision.schema_query_performed, false);
  assert.equal(decision.connection_policy.host, "127.0.0.1");
  assert.equal(decision.connection_policy.port, port);
  assert.equal(
    decision.connection_policy.database,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
  );
  assert.equal(
    decision.connection_policy.user,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
  );
  assert.equal(
    decision.connection_policy.application_name,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
  );
  assert.equal(decision.connection_policy.ssl_mode, "verify-full");
  assert.equal(decision.connection_policy.tls_server_name, "localhost");
  assert.equal(decision.connection_policy.tls_minimum_version, "TLSv1.2");
  assert.equal(decision.connection_policy.ssl_negotiation, "postgres");
  assert.equal(decision.connection_policy.channel_binding_enabled, true);
  assert.equal(decision.connection_policy.pipeline_enabled, false);
  assert.equal(decision.connection_policy.client_encoding, "UTF8");
  assert.equal(decision.connection_policy.connection_string_used, false);
  assert.equal(decision.connection_policy.ambient_libpq_fallback, false);

  await delay(100);
  assert.equal(connectionCount, 0, "pool construction must remain lazy");

  await assert.rejects(
    Promise.race([
      decision.pool.connect(),
      delay(3000).then(() => {
        throw new Error("synthetic_connect_timeout");
      }),
    ]),
    (error: unknown) => {
      assert.notEqual(
        String((error as Error | null)?.message || ""),
        "synthetic_connect_timeout",
      );
      return true;
    },
  );
  assert.equal(connectionCount, 1);
  const firstPacket = await Promise.race([
    firstPacketPromise,
    delay(1000).then(() => {
      throw new Error("postgres_sslrequest_packet_timeout");
    }),
  ]);
  assert.deepEqual(
    Array.from(firstPacket.subarray(0, 8)),
    [0, 0, 0, 8, 4, 210, 22, 47],
  );

  await decision.close();
  await assert.rejects(
    () => decision.pool.connect(),
    /dispatcher_postgres_connection_factory_closed/,
  );
  ready = null;
} finally {
  if (ready) await ready.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  for (const [key, value] of savedEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

fs.chmodSync(passwordPath, 0o600);
await expectHeld(
  "writable password credential",
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(candidate(5432)),
  "dispatcher_postgres_password_credential_mode_not_0400",
);
fs.chmodSync(passwordPath, 0o400);

fs.chmodSync(passwordPath, 0o600);
fs.writeFileSync(passwordPath, Buffer.concat([originalPassword, Buffer.from("\n")]));
fs.chmodSync(passwordPath, 0o400);
await expectHeld(
  "password newline",
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(candidate(5432)),
  "dispatcher_postgres_password_credential_shape_invalid",
);
fs.chmodSync(passwordPath, 0o600);
fs.writeFileSync(passwordPath, originalPassword);
fs.chmodSync(passwordPath, 0o400);

const realPasswordPath = passwordPath + ".real";
fs.renameSync(passwordPath, realPasswordPath);
fs.symlinkSync(path.basename(realPasswordPath), passwordPath);
await expectHeld(
  "password symlink",
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(candidate(5432)),
  "dispatcher_postgres_password_credential_symlink_forbidden",
);
fs.unlinkSync(passwordPath);
fs.renameSync(realPasswordPath, passwordPath);
fs.chmodSync(passwordPath, 0o400);

fs.chmodSync(caPath, 0o600);
fs.writeFileSync(
  caPath,
  "-----BEGIN PRIVATE KEY-----\nforbidden\n-----END PRIVATE KEY-----\n",
);
fs.chmodSync(caPath, 0o400);
await expectHeld(
  "private key in CA credential",
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(candidate(5432)),
  "dispatcher_postgres_ca_credential_shape_invalid",
);
fs.chmodSync(caPath, 0o600);
fs.writeFileSync(caPath, originalCa);
fs.chmodSync(caPath, 0o400);

fs.chmodSync(caPath, 0o600);
fs.writeFileSync(
  caPath,
  "-----BEGIN CERTIFICATE-----\ninvalid\n-----END CERTIFICATE-----\n",
);
fs.chmodSync(caPath, 0o400);
await expectHeld(
  "malformed CA certificate",
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(candidate(5432)),
  "dispatcher_postgres_ca_credential_parse_invalid",
);
fs.chmodSync(caPath, 0o600);
fs.writeFileSync(caPath, originalCa);
fs.chmodSync(caPath, 0o400);

fs.chmodSync(caPath, 0o600);
fs.writeFileSync(
  caPath,
  Buffer.concat([originalCa, Buffer.from("\nTRAILING_GARBAGE\n")]),
);
fs.chmodSync(caPath, 0o400);
await expectHeld(
  "trailing non-certificate CA content",
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(candidate(5432)),
  "dispatcher_postgres_ca_credential_shape_invalid",
);
fs.chmodSync(caPath, 0o600);
fs.writeFileSync(caPath, originalCa);
fs.chmodSync(caPath, 0o400);

fs.chmodSync(caPath, 0o600);
fs.writeFileSync(
  caPath,
  Buffer.concat([
    originalCa,
    Buffer.from(
      "\n-----BEGIN CERTIFICATE-----\ninvalid\n-----END CERTIFICATE-----\n",
    ),
  ]),
);
fs.chmodSync(caPath, 0o400);
await expectHeld(
  "malformed additional CA certificate",
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(candidate(5432)),
  "dispatcher_postgres_ca_credential_parse_invalid",
);
fs.chmodSync(caPath, 0o600);
fs.writeFileSync(caPath, originalCa);
fs.chmodSync(caPath, 0o400);

const nestedReal = path.join(credentialsDirectory, "nested-real");
const nestedLink = path.join(credentialsDirectory, "nested-link");
fs.mkdirSync(nestedReal, { mode: 0o700 });
fs.copyFileSync(passwordPath, path.join(
  nestedReal,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
));
fs.copyFileSync(caPath, path.join(
  nestedReal,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
));
fs.chmodSync(
  path.join(
    nestedReal,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  ),
  0o400,
);
fs.chmodSync(
  path.join(
    nestedReal,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  ),
  0o400,
);
fs.symlinkSync(path.basename(nestedReal), nestedLink);
await expectHeld(
  "credential directory symlink",
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(
    candidate(5432, nestedLink),
  ),
  [
    "dispatcher_postgres_credentials_directory_symlink_forbidden",
    "dispatcher_postgres_credentials_directory_unavailable",
  ],
);
fs.unlinkSync(nestedLink);
fs.rmSync(nestedReal, { recursive: true, force: true });

fs.chmodSync(credentialsDirectory, 0o755);
await expectHeld(
  "broad credential directory permissions",
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(candidate(5432)),
  "dispatcher_postgres_credentials_directory_permissions_too_broad",
);
fs.chmodSync(credentialsDirectory, 0o700);

const oversized = Buffer.alloc(4097, 0x61);
fs.chmodSync(passwordPath, 0o600);
fs.writeFileSync(passwordPath, oversized);
fs.chmodSync(passwordPath, 0o400);
await expectHeld(
  "oversized password credential",
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(candidate(5432)),
  "dispatcher_postgres_password_credential_size_out_of_policy",
);
fs.chmodSync(passwordPath, 0o600);
fs.writeFileSync(passwordPath, originalPassword);
fs.chmodSync(passwordPath, 0o400);

console.log(
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1_PROOF_GREEN",
);
console.log("postgres_connection_factory_cases=11");
console.log("package_pg_version=8.23.0");
console.log("package_pg_types_version=8.23.1");
console.log("descriptor_pinned_credentials=true");
console.log("nofollow_symlink_guards=true");
console.log("credential_permission_bounds=true");
console.log("credential_file_mode_0400_required=true");
console.log("bounded_credential_reads=true");
console.log("pool_construction_network_connect=false");
console.log("ambient_pg_environment_ignored=true");
console.log("postgres_sslrequest_negotiation_observed=true");
console.log("tls_verify_full_required=true");
console.log("channel_binding_enabled=true");
console.log("pipeline_enabled=false");
console.log("connection_string_used=false");
console.log("schema_query_on_factory_creation=false");
console.log("automatic_schema_migration=false");
console.log("runtime_route_mount=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
