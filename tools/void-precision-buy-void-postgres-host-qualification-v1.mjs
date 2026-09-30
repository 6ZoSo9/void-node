import path from "node:path";
import { pathToFileURL } from "node:url";

export const VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1 =
  "VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1";

export const VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_AUTHORITY_V1 =
  Object.freeze({
    designated_host_read_only_qualification: true,
    live_repo_source_slice_read: true,
    service_environment_read: true,
    systemd_credential_metadata_read: true,
    credential_content_read_inside_reviewed_factory: true,
    credential_content_output: false,
    loopback_postgres_tls_connect: true,
    schema_catalog_query: true,
    repeatable_read_read_only_transaction: true,
    database_mutation: false,
    schema_mutation: false,
    runtime_gate_mutation: false,
    service_mutation: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    token_or_work_credit_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

export const VOID_BUY_VOID_PRECISION_POSTGRES_SOURCE_SLICE_BLOBS_V1 =
  Object.freeze({
    "ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example":
      "a3500a7f1813972b90e5c00dbf8a03ed4b4ddd6b",
    "ops/systemd/void-node-live.service.d/92-buy-void-dispatcher-postgres-credentials-v1.conf.example":
      "dfe25fac6dfd98bc884ade38fe5196e6c048f60b",
    "ops/systemd/void-node-live.service.d/94-buy-void-claimed-postgres-precision-reconcile-v1.conf.example":
      "67981a141ebfc8a05902fdefc21a8db58946329c",
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.ts":
      "7133a3a7ebb9349d195cc090787a134f07616a3e",
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts":
      "066b5d3fde11ec79a8c6bb45f2ec5d6fec511e1f",
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.ts":
      "88c72330c5a5b92780f2c6add7dda7dd5e92af10",
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.ts":
      "aae34461ac47b3c5cbdecf75e6f6aa5935df677e",
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.ts":
      "2db30a0d7f343c5c1264d89ec5c752ade609d843",
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts":
      "f74cafa7665be4ac0ea4fd518ec02440d337fa27",
    "src/economic/buy_void_payment_keyed_full_runtime_v1.ts":
      "1c238ae8dff7e088421eabff93a98d97357d99e7",
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_v1.ts":
      "27045345cf48cacd2a5f2bc9330812579d0761a4",
    "package.json":
      "f28c3e9446c7623ef203da36a9642d046e5f34ee",
    "package-lock.json":
      "b2671f0149f522b2489247016df0a5ec4bb72b8b",
  });

const ENV = Object.freeze({
  runtimeIntegration: "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
  fullRuntime: "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
  fullApply: "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
  claimedRuntime:
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
  admittedRuntime:
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
  host: "VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST",
  port: "VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT",
  poolMax: "VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX",
  connectionTimeoutMs: "VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS",
  idleTimeoutMs: "VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS",
  credentialsDirectory: "CREDENTIALS_DIRECTORY",
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function exact(env, name, expected) {
  const actual = text(env[name]);
  if (actual !== expected) {
    throw new Error(
      "host_environment_mismatch:" + name + ":expected=" + expected +
      ":actual=" + (actual || "<unset>"),
    );
  }
  return actual;
}

export function requireDormantPostgresHostStateV1(env = process.env) {
  return Object.freeze({
    runtime_integration: exact(env, ENV.runtimeIntegration, "1"),
    full_runtime: exact(env, ENV.fullRuntime, "0"),
    full_runtime_apply: exact(env, ENV.fullApply, "0"),
    claimed_runtime: exact(env, ENV.claimedRuntime, "0"),
    admitted_guarded_runtime: exact(env, ENV.admittedRuntime, "0"),
    postgres_host: exact(env, ENV.host, "127.0.0.1"),
    postgres_port: exact(env, ENV.port, "5432"),
    postgres_pool_max: exact(env, ENV.poolMax, "4"),
    postgres_connection_timeout_ms:
      exact(env, ENV.connectionTimeoutMs, "5000"),
    postgres_idle_timeout_ms:
      exact(env, ENV.idleTimeoutMs, "5000"),
    credentials_directory: (() => {
      const value = text(env[ENV.credentialsDirectory]);
      if (!value || !path.isAbsolute(value) || value.includes("\0")) {
        throw new Error("credentials_directory_invalid");
      }
      return value;
    })(),
  });
}

function safeReason(value) {
  const raw = String(value || "unknown");
  return /^[A-Za-z0-9._:-]{1,200}$/.test(raw) ? raw : "unsafe_error_redacted";
}

async function importLive(repoRoot, relativePath) {
  const target = path.join(repoRoot, relativePath);
  return import(pathToFileURL(target).href);
}

export async function qualifyVoidBuyVoidPrecisionPostgresHostV1({
  env = process.env,
  repoRoot = text(process.env.VOID_LIVE_REPO_ROOT),
} = {}) {
  const dormant = requireDormantPostgresHostStateV1(env);
  if (!repoRoot || !path.isAbsolute(repoRoot)) {
    throw new Error("live_repo_root_invalid");
  }

  const configModule = await importLive(
    repoRoot,
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.ts",
  );
  const factoryModule = await importLive(
    repoRoot,
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts",
  );
  const admissionModule = await importLive(
    repoRoot,
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.ts",
  );

  const candidate = {
    VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST: dormant.postgres_host,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT: dormant.postgres_port,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_DATABASE:
      configModule.VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_USER:
      configModule.VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_APPLICATION_NAME:
      configModule.VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_SCHEMA_CONTRACT:
      configModule.VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_SSL_MODE: "verify-full",
    VOID_BUY_VOID_DISPATCHER_POSTGRES_TLS_SERVER_NAME: "localhost",
    VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX: dormant.postgres_pool_max,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS:
      dormant.postgres_connection_timeout_ms,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS:
      dormant.postgres_idle_timeout_ms,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID:
      configModule.VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID:
      configModule.VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
    CREDENTIALS_DIRECTORY: dormant.credentials_directory,
  };

  const factory =
    factoryModule.createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(
      candidate,
    );
  if (factory?.ok !== true) {
    throw new Error(
      "postgres_factory_held:" + safeReason(factory?.reason),
    );
  }
  if (
    factory.marker !==
      factoryModule.VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1 ||
    factory.version !== 1 ||
    factory.status !== "ready" ||
    factory.authority !==
      factoryModule.VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_AUTHORITY_V1 ||
    !/^[0-9a-f]{64}$/.test(
      String(factory.configuration_fingerprint_sha256 || ""),
    )
  ) {
    try {
      await factory.close?.();
    } catch {
      // Identity failure remains authoritative.
    }
    throw new Error("postgres_factory_identity_invalid");
  }

  let admission;
  let closeFailed = false;
  try {
    admission =
      await admissionModule.admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(
        factory,
      );
  } finally {
    try {
      await factory.close();
    } catch {
      closeFailed = true;
    }
  }

  if (closeFailed) {
    throw new Error("postgres_factory_close_failed");
  }
  if (admission?.ok !== true) {
    throw new Error(
      "postgres_schema_admission_held:" + safeReason(admission?.reason),
    );
  }
  if (
    admission.marker !==
      admissionModule.VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1 ||
    admission.version !== 1 ||
    admission.status !== "schema_admitted" ||
    admission.authority !==
      admissionModule.VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1 ||
    admission.configuration_fingerprint_sha256 !==
      factory.configuration_fingerprint_sha256 ||
    !/^[0-9a-f]{64}$/.test(
      String(admission.schema_fingerprint_sha256 || ""),
    ) ||
    admission.schema_query_performed !== true ||
    admission.database_mutation_performed !== false
  ) {
    throw new Error("postgres_schema_admission_contract_invalid");
  }

  return Object.freeze({
    marker: VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1,
    version: 1,
    status: "POSTGRES_FACTORY_AND_SCHEMA_ADMITTED_DORMANT",
    configuration_fingerprint_sha256:
      admission.configuration_fingerprint_sha256,
    schema_fingerprint_sha256:
      admission.schema_fingerprint_sha256,
    credential_read_performed: true,
    credential_content_output: false,
    loopback_postgres_tls_connect_performed: true,
    schema_query_performed: true,
    database_mutation_performed: false,
    full_runtime_enabled: false,
    full_runtime_apply_enabled: false,
    claimed_runtime_enabled: false,
    admitted_guarded_runtime_enabled: false,
    worker_invoked: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
    authority:
      VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_AUTHORITY_V1,
  });
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (direct) {
  try {
    const result = await qualifyVoidBuyVoidPrecisionPostgresHostV1();
    console.log(VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1);
    console.log("status=" + result.status);
    console.log(
      "configuration_fingerprint_sha256=" +
      result.configuration_fingerprint_sha256,
    );
    console.log(
      "schema_fingerprint_sha256=" + result.schema_fingerprint_sha256,
    );
    console.log("credential_read_performed=true");
    console.log("credential_content_output=false");
    console.log("loopback_postgres_tls_connect_performed=true");
    console.log("schema_query_performed=true");
    console.log("database_mutation_performed=false");
    console.log("full_runtime_enabled=false");
    console.log("full_runtime_apply_enabled=false");
    console.log("claimed_runtime_enabled=false");
    console.log("admitted_guarded_runtime_enabled=false");
    console.log("worker_invoked=false");
    console.log("transaction_broadcast_performed=false");
    console.log("funds_movement_performed=false");
    console.log(
      "VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1_GREEN",
    );
  } catch (error) {
    console.error(
      "VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1_HOLD",
    );
    console.error(
      "reason=" +
      safeReason(error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 2;
  }
}
