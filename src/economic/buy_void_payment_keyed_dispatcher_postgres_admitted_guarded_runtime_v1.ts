import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_APPLICATION_NAME_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_DATABASE_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_CONTRACT_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_USER_V1,
} from "./buy_void_payment_keyed_dispatcher_postgres_production_config_v1.js";
import {
  createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1,
  type BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1,
  admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1,
  type BuyVoidPaymentKeyedDispatcherPostgresSchemaAdmissionDecisionV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1,
  applyBuyVoidPaymentKeyedDispatcherGuardedBroadcastV1,
  type BuyVoidPaymentKeyedDispatcherGuardedBroadcastApplyDecisionV1,
} from "./buy_void_payment_keyed_dispatcher_guarded_broadcast_apply_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
  buyVoidPaymentKeyedFullRuntimePolicyStateV1,
  buyVoidPaymentKeyedFullRuntimeRootDirV1,
} from "./buy_void_payment_keyed_full_runtime_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLE_ENV_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_AUTHORITY_V1 =
  Object.freeze({
    source_only_composition: true,
    disabled_by_default: true,
    exact_enable_value_required: true,
    process_environment_configuration: true,
    caller_configuration_authority: false,
    caller_pool_authority: false,
    caller_factory_authority: false,
    caller_root_dir_authority: false,
    caller_stage_authority: false,
    caller_signer_authority: false,
    caller_broadcaster_authority: false,
    caller_rpc_url_authority: false,
    fixed_postgres_identity: true,
    fixed_systemd_credential_ids: true,
    connection_factory_constructed_internally: true,
    live_schema_admission_required_before_worker: true,
    schema_admission_database_mutation_allowed: false,
    same_admitted_factory_pool_reused_for_worker: true,
    bounded_guarded_broadcast_worker_required: true,
    factory_close_after_command: true,
    automatic_retry: false,
    runtime_route_mount: false,
    service_mutation: false,
    signing_possible_only_inside_guarded_worker: true,
    transaction_broadcast_possible_only_inside_guarded_worker: true,
    money_movement_possible_only_inside_guarded_worker: true,
  } as const);

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1 =
  Object.freeze({
    enabled:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLE_ENV_V1,
    postgres_host: "VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST",
    postgres_port: "VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT",
    postgres_pool_max: "VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX",
    postgres_connection_timeout_ms:
      "VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS",
    postgres_idle_timeout_ms:
      "VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS",
    credentials_directory: "CREDENTIALS_DIRECTORY",
  } as const);

type StageV1 =
  | "input"
  | "disabled"
  | "runtime_gate"
  | "runtime_policy"
  | "postgres_factory"
  | "schema_admission"
  | "worker";

export type BuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeDecisionV1 = {
  ok: boolean;
  status: "applied" | "held" | "reconciliation_required";
  marker:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1;
  version: 1;
  stage: StageV1;
  reason: string | null;
  attempt_id: string | null;
  worker_id: string | null;
  configuration_fingerprint_sha256: string | null;
  schema_fingerprint_sha256: string | null;
  credential_read_performed: boolean;
  schema_query_performed: boolean;
  schema_admission_database_mutation_performed: false;
  dispatcher_database_mutation_may_have_occurred: boolean;
  worker_invoked: boolean;
  factory_close_attempted: boolean;
  factory_close_failed: boolean;
  worker: BuyVoidPaymentKeyedDispatcherGuardedBroadcastApplyDecisionV1 | null;
  broadcast_call_performed: boolean;
  transaction_broadcast_accepted: boolean;
  money_movement_performed: boolean;
  money_movement_may_have_occurred: boolean;
  authority:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_AUTHORITY_V1;
};

const ATTEMPT_ID = /^[0-9a-f]{64}$/;
const LEASE_TOKEN = /^[0-9a-f]{32}$/;
const WORKER_ID = /^[A-Za-z0-9._:@/-]{1,160}$/;

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function exactOwnDataObject(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  let proto: object | null;
  try {
    proto = Object.getPrototypeOf(value);
  } catch {
    return null;
  }
  if (proto !== Object.prototype && proto !== null) return null;
  try {
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== keys.length ||
      ownKeys.some(
        (key) => typeof key !== "string" || !keys.includes(key),
      )
    ) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        return null;
      }
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function lease(value: unknown): BuyVoidPaymentKeyedDispatcherLeaseV1 | null {
  const record = exactOwnDataObject(value, [
    "marker",
    "attempt_id",
    "lease_gen",
    "lease_token",
    "worker_id",
    "lease_expires_us",
  ]);
  if (!record) return null;
  if (
    record.marker !== VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 ||
    typeof record.attempt_id !== "string" ||
    !ATTEMPT_ID.test(record.attempt_id) ||
    typeof record.lease_gen !== "bigint" ||
    record.lease_gen <= 0n ||
    typeof record.lease_token !== "string" ||
    !LEASE_TOKEN.test(record.lease_token) ||
    typeof record.worker_id !== "string" ||
    !WORKER_ID.test(record.worker_id) ||
    typeof record.lease_expires_us !== "bigint" ||
    record.lease_expires_us <= 0n
  ) {
    return null;
  }
  return record as BuyVoidPaymentKeyedDispatcherLeaseV1;
}

function inputLease(input: unknown): BuyVoidPaymentKeyedDispatcherLeaseV1 | null {
  const record = exactOwnDataObject(input, ["lease"]);
  return record ? lease(record.lease) : null;
}

function bool(env: NodeJS.ProcessEnv, name: string): boolean {
  return text(env[name]) === "1";
}

function serverRoot(env: NodeJS.ProcessEnv): string {
  const root = path.resolve(buyVoidPaymentKeyedFullRuntimeRootDirV1(env));
  if (root === path.parse(root).root || root.includes("\0")) return "";
  return root;
}

function configCandidate(env: NodeJS.ProcessEnv): Record<string, string> {
  const names =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1;
  return {
    VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST:
      text(env[names.postgres_host]),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT:
      text(env[names.postgres_port]),
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
    VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX:
      text(env[names.postgres_pool_max]),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS:
      text(env[names.postgres_connection_timeout_ms]),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS:
      text(env[names.postgres_idle_timeout_ms]),
    VOID_BUY_VOID_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID_V1,
    VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID_V1,
    CREDENTIALS_DIRECTORY:
      text(env[names.credentials_directory]),
  };
}

function decision(
  options: Partial<
    Omit<
      BuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeDecisionV1,
      "marker" | "version" | "authority" | "schema_admission_database_mutation_performed"
    >
  > & {
    ok: boolean;
    status: "applied" | "held" | "reconciliation_required";
    stage: StageV1;
  },
): BuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeDecisionV1 {
  return {
    ok: options.ok,
    status: options.status,
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1,
    version: 1,
    stage: options.stage,
    reason: options.reason ?? null,
    attempt_id: options.attempt_id ?? null,
    worker_id: options.worker_id ?? null,
    configuration_fingerprint_sha256:
      options.configuration_fingerprint_sha256 ?? null,
    schema_fingerprint_sha256:
      options.schema_fingerprint_sha256 ?? null,
    credential_read_performed:
      options.credential_read_performed === true,
    schema_query_performed:
      options.schema_query_performed === true,
    schema_admission_database_mutation_performed: false,
    dispatcher_database_mutation_may_have_occurred:
      options.dispatcher_database_mutation_may_have_occurred === true,
    worker_invoked: options.worker_invoked === true,
    factory_close_attempted:
      options.factory_close_attempted === true,
    factory_close_failed:
      options.factory_close_failed === true,
    worker: options.worker ?? null,
    broadcast_call_performed:
      options.broadcast_call_performed === true,
    transaction_broadcast_accepted:
      options.transaction_broadcast_accepted === true,
    money_movement_performed:
      options.money_movement_performed === true,
    money_movement_may_have_occurred:
      options.money_movement_may_have_occurred === true,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_AUTHORITY_V1,
  };
}

function fromWorker(
  worker: BuyVoidPaymentKeyedDispatcherGuardedBroadcastApplyDecisionV1,
  admission: Extract<
    BuyVoidPaymentKeyedDispatcherPostgresSchemaAdmissionDecisionV1,
    { ok: true }
  >,
): BuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeDecisionV1 {
  return decision({
    ok: worker.ok,
    status: worker.status,
    stage: "worker",
    reason: worker.ok ? null : worker.reason,
    attempt_id: worker.attempt_id,
    worker_id: worker.worker_id,
    configuration_fingerprint_sha256:
      admission.configuration_fingerprint_sha256,
    schema_fingerprint_sha256:
      admission.schema_fingerprint_sha256,
    credential_read_performed: true,
    schema_query_performed: true,
    worker_invoked: true,
    dispatcher_database_mutation_may_have_occurred: true,
    worker,
    broadcast_call_performed: worker.broadcast_call_performed,
    transaction_broadcast_accepted:
      worker.transaction_broadcast_accepted,
    money_movement_performed: worker.money_movement_performed,
    money_movement_may_have_occurred:
      worker.money_movement_may_have_occurred,
  });
}

async function composeWithFactory(
  factory: BuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryReadyV1,
  root: string,
  currentLease: BuyVoidPaymentKeyedDispatcherLeaseV1,
): Promise<BuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeDecisionV1> {
  let admission: BuyVoidPaymentKeyedDispatcherPostgresSchemaAdmissionDecisionV1;
  try {
    admission =
      await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(factory);
  } catch {
    return decision({
      ok: false,
      status: "held",
      stage: "schema_admission",
      reason: "schema_admission_exception",
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
      configuration_fingerprint_sha256:
        factory.configuration_fingerprint_sha256,
      credential_read_performed: true,
      schema_query_performed: true,
    });
  }

  if (admission.ok === false) {
    return decision({
      ok: false,
      status: "held",
      stage: "schema_admission",
      reason: "schema_admission_held:" + admission.reason,
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
      configuration_fingerprint_sha256:
        factory.configuration_fingerprint_sha256,
      credential_read_performed: true,
      schema_query_performed: admission.schema_query_performed,
    });
  }

  if (
    admission.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1 ||
    admission.authority !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1 ||
    admission.database_mutation_performed !== false ||
    admission.configuration_fingerprint_sha256 !==
      factory.configuration_fingerprint_sha256
  ) {
    return decision({
      ok: false,
      status: "held",
      stage: "schema_admission",
      reason: "schema_admission_identity_mismatch",
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
      configuration_fingerprint_sha256:
        factory.configuration_fingerprint_sha256,
      schema_fingerprint_sha256:
        admission.schema_fingerprint_sha256,
      credential_read_performed: true,
      schema_query_performed: true,
    });
  }

  try {
    const worker =
      await applyBuyVoidPaymentKeyedDispatcherGuardedBroadcastV1({
        root_dir: root,
        lease: currentLease,
        pool: factory.pool,
      });
    if (
      worker.marker !==
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1
    ) {
      return decision({
        ok: false,
        status: "reconciliation_required",
        stage: "worker",
        reason: "worker_identity_mismatch_after_entry",
        attempt_id: currentLease.attempt_id,
        worker_id: currentLease.worker_id,
        configuration_fingerprint_sha256:
          admission.configuration_fingerprint_sha256,
        schema_fingerprint_sha256:
          admission.schema_fingerprint_sha256,
        credential_read_performed: true,
        schema_query_performed: true,
        worker_invoked: true,
        dispatcher_database_mutation_may_have_occurred: true,
        money_movement_may_have_occurred: true,
      });
    }
    return fromWorker(worker, admission);
  } catch {
    return decision({
      ok: false,
      status: "reconciliation_required",
      stage: "worker",
      reason: "worker_exception_after_entry",
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
      configuration_fingerprint_sha256:
        admission.configuration_fingerprint_sha256,
      schema_fingerprint_sha256:
        admission.schema_fingerprint_sha256,
      credential_read_performed: true,
      schema_query_performed: true,
      worker_invoked: true,
      dispatcher_database_mutation_may_have_occurred: true,
      money_movement_may_have_occurred: true,
    });
  }
}

export async function runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1(
  input: unknown,
): Promise<BuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeDecisionV1> {
  const env = process.env;
  const currentLease = inputLease(input);
  if (!currentLease) {
    return decision({
      ok: false,
      status: "held",
      stage: "input",
      reason: "input_invalid",
    });
  }

  const names =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1;
  if (!bool(env, names.enabled)) {
    return decision({
      ok: false,
      status: "held",
      stage: "disabled",
      reason: "postgres_admitted_guarded_runtime_disabled",
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
    });
  }

  const fullRuntimeEnvs =
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1;
  if (!bool(env, fullRuntimeEnvs.enabled)) {
    return decision({
      ok: false,
      status: "held",
      stage: "runtime_gate",
      reason: "full_runtime_disabled",
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
    });
  }
  if (!bool(env, fullRuntimeEnvs.apply_enabled)) {
    return decision({
      ok: false,
      status: "held",
      stage: "runtime_gate",
      reason: "full_runtime_apply_disabled",
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
    });
  }

  let policy: ReturnType<typeof buyVoidPaymentKeyedFullRuntimePolicyStateV1>;
  try {
    policy = buyVoidPaymentKeyedFullRuntimePolicyStateV1(env);
  } catch {
    return decision({
      ok: false,
      status: "held",
      stage: "runtime_policy",
      reason: "runtime_policy_exception",
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
    });
  }
  if (policy.configured !== true) {
    return decision({
      ok: false,
      status: "held",
      stage: "runtime_policy",
      reason: "runtime_policy_held:" + policy.reason,
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
    });
  }

  const root = serverRoot(env);
  if (!root || path.resolve(policy.root_dir) !== root) {
    return decision({
      ok: false,
      status: "held",
      stage: "runtime_policy",
      reason: "runtime_root_mismatch",
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
    });
  }

  let factoryDecision;
  try {
    factoryDecision =
      createBuyVoidPaymentKeyedDispatcherPostgresConnectionFactoryV1(
        configCandidate(env),
      );
  } catch {
    return decision({
      ok: false,
      status: "held",
      stage: "postgres_factory",
      reason: "postgres_factory_exception",
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
      credential_read_performed: true,
    });
  }

  if (factoryDecision.ok === false) {
    return decision({
      ok: false,
      status: "held",
      stage: "postgres_factory",
      reason: "postgres_factory_held:" + factoryDecision.reason,
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
      credential_read_performed:
        factoryDecision.credential_read_performed,
    });
  }

  let result: BuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeDecisionV1;
  let closeFailed = false;
  try {
    result =
      await composeWithFactory(
        factoryDecision,
        root,
        currentLease,
      );
  } catch {
    result = decision({
      ok: false,
      status: "reconciliation_required",
      stage: "worker",
      reason: "composition_exception_after_factory_ready",
      attempt_id: currentLease.attempt_id,
      worker_id: currentLease.worker_id,
      configuration_fingerprint_sha256:
        factoryDecision.configuration_fingerprint_sha256,
      credential_read_performed: true,
      schema_query_performed: true,
      dispatcher_database_mutation_may_have_occurred: true,
      worker_invoked: true,
      money_movement_may_have_occurred: true,
    });
  } finally {
    try {
      await factoryDecision.close();
    } catch {
      closeFailed = true;
    }
  }
  return {
    ...result,
    factory_close_attempted: true,
    factory_close_failed: closeFailed,
  };
}
