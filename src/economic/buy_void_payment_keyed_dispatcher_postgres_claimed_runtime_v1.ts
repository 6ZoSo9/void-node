import path from "node:path";

import type {
  BuyVoidPaymentKeyedDispatcherLeaseV1,
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
} from "./buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1,
  admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.js";
import {
  createBuyVoidPaymentKeyedDispatcherPostgresStoreV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_store_v1.js";
import {
  enqueueBuyVoidPaymentKeyedPreparedAttemptV1,
} from "./buy_void_payment_keyed_dispatcher_enqueue_v1.js";
import {
  claimBuyVoidPaymentKeyedPreparedAttemptV1,
} from "./buy_void_payment_keyed_dispatcher_claim_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1,
  runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
  buyVoidPaymentKeyedFullRuntimePolicyStateV1,
  buyVoidPaymentKeyedFullRuntimeRootDirV1,
} from "./buy_void_payment_keyed_full_runtime_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLE_ENV_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1 =
  "VOID_CONFIRM_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CLIENT_ID_V1 =
  "void-buy-void-postgres-claimed-runtime-v1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_WORKER_ID_V1 =
  "void-buy-void-postgres-worker-v1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_AUTHORITY_V1 =
  Object.freeze({
    source_only_composition: true,
    runtime_route_mount: false,
    disabled_by_default: true,
    exact_enable_value_required: true,
    exact_apply_true_required: true,
    exact_confirmation_required: true,
    caller_attempt_id_selection_only: true,
    caller_root_dir_authority: false,
    caller_client_id_authority: false,
    caller_worker_id_authority: false,
    caller_lease_authority: false,
    caller_lease_ttl_authority: false,
    caller_postgres_authority: false,
    caller_pool_authority: false,
    caller_factory_authority: false,
    caller_signer_authority: false,
    caller_broadcaster_authority: false,
    caller_rpc_url_authority: false,
    server_enqueue_required: true,
    server_claim_required: true,
    fixed_enqueue_client_id: true,
    fixed_claim_worker_id: true,
    fixed_claim_lease_policy: true,
    live_schema_admission_before_dispatcher_mutation: true,
    claim_factory_closed_before_child: true,
    fresh_child_factory_revalidation_required: true,
    lease_capability_returned: false,
    raw_signed_transaction_returned: false,
    automatic_retry: false,
    background_loop: false,
    service_mutation: false,
    signing_possible_only_inside_admitted_child: true,
    transaction_broadcast_possible_only_inside_admitted_child: true,
    money_movement_possible_only_inside_admitted_child: true,
  } as const);

type ChildDecisionV1 = Awaited<
  ReturnType<
    typeof runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1
  >
>;

type StageV1 =
  | "input"
  | "disabled"
  | "runtime_gate"
  | "runtime_policy"
  | "postgres_factory"
  | "schema_admission"
  | "enqueue"
  | "claim"
  | "claim_factory_close"
  | "child";

export type BuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeDecisionV1 = {
  ok: boolean;
  status: "applied" | "held" | "reconciliation_required";
  marker:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1;
  version: 1;
  stage: StageV1;
  reason: string | null;
  attempt_id: string | null;
  worker_id: string | null;
  enqueue_status: "submitted" | "idempotent" | "held" | "conflict" | null;
  claim_status: "claimed" | "published" | "held" | "rejected" | null;
  credential_read_performed: boolean;
  schema_query_performed: boolean;
  schema_admission_database_mutation_performed: false;
  dispatcher_database_mutation_may_have_occurred: boolean;
  lease_capability_issued: boolean;
  lease_capability_returned: false;
  claim_factory_close_attempted: boolean;
  claim_factory_close_failed: boolean;
  child_invoked: boolean;
  child: ChildDecisionV1 | null;
  raw_signed_transaction_returned: false;
  broadcast_call_performed: boolean;
  transaction_broadcast_accepted: boolean;
  money_movement_performed: boolean;
  money_movement_may_have_occurred: boolean;
  automatic_retry_allowed: false;
  authority:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_AUTHORITY_V1;
};

const SHA256 = /^[0-9a-f]{64}$/;

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function flag(env: NodeJS.ProcessEnv, name: string): boolean {
  return text(env[name]) === "1";
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

function inputAttempt(input: unknown): {
  attempt_id: string;
  apply: true;
  confirmation: string;
} | null {
  const record = exactOwnDataObject(input, [
    "attempt_id",
    "apply",
    "confirmation",
  ]);
  if (!record) return null;
  if (
    typeof record.attempt_id !== "string" ||
    !SHA256.test(record.attempt_id) ||
    record.apply !== true ||
    record.confirmation !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1
  ) {
    return null;
  }
  return {
    attempt_id: record.attempt_id,
    apply: true,
    confirmation: record.confirmation as string,
  };
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
      BuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeDecisionV1,
      | "marker"
      | "version"
      | "authority"
      | "schema_admission_database_mutation_performed"
      | "lease_capability_returned"
      | "raw_signed_transaction_returned"
      | "automatic_retry_allowed"
    >
  > & {
    ok: boolean;
    status: "applied" | "held" | "reconciliation_required";
    stage: StageV1;
  },
): BuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeDecisionV1 {
  return {
    ok: options.ok,
    status: options.status,
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1,
    version: 1,
    stage: options.stage,
    reason: options.reason ?? null,
    attempt_id: options.attempt_id ?? null,
    worker_id: options.worker_id ?? null,
    enqueue_status: options.enqueue_status ?? null,
    claim_status: options.claim_status ?? null,
    credential_read_performed:
      options.credential_read_performed === true,
    schema_query_performed:
      options.schema_query_performed === true,
    schema_admission_database_mutation_performed: false,
    dispatcher_database_mutation_may_have_occurred:
      options.dispatcher_database_mutation_may_have_occurred === true,
    lease_capability_issued:
      options.lease_capability_issued === true,
    lease_capability_returned: false,
    claim_factory_close_attempted:
      options.claim_factory_close_attempted === true,
    claim_factory_close_failed:
      options.claim_factory_close_failed === true,
    child_invoked: options.child_invoked === true,
    child: options.child ?? null,
    raw_signed_transaction_returned: false,
    broadcast_call_performed:
      options.broadcast_call_performed === true,
    transaction_broadcast_accepted:
      options.transaction_broadcast_accepted === true,
    money_movement_performed:
      options.money_movement_performed === true,
    money_movement_may_have_occurred:
      options.money_movement_may_have_occurred === true,
    automatic_retry_allowed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_AUTHORITY_V1,
  };
}

export async function runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1(
  input: unknown,
): Promise<BuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeDecisionV1> {
  const command = inputAttempt(input);
  if (!command) {
    return decision({
      ok: false,
      status: "held",
      stage: "input",
      reason: "input_invalid_or_explicit_authority_missing",
    });
  }

  const env = process.env;
  if (
    !flag(
      env,
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLE_ENV_V1,
    )
  ) {
    return decision({
      ok: false,
      status: "held",
      stage: "disabled",
      reason: "postgres_claimed_runtime_disabled",
      attempt_id: command.attempt_id,
    });
  }

  const admittedEnvs =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1;
  if (!flag(env, admittedEnvs.enabled)) {
    return decision({
      ok: false,
      status: "held",
      stage: "runtime_gate",
      reason: "admitted_guarded_runtime_disabled",
      attempt_id: command.attempt_id,
    });
  }

  const fullRuntimeEnvs =
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1;
  if (!flag(env, fullRuntimeEnvs.enabled)) {
    return decision({
      ok: false,
      status: "held",
      stage: "runtime_gate",
      reason: "full_runtime_disabled",
      attempt_id: command.attempt_id,
    });
  }
  if (!flag(env, fullRuntimeEnvs.apply_enabled)) {
    return decision({
      ok: false,
      status: "held",
      stage: "runtime_gate",
      reason: "full_runtime_apply_disabled",
      attempt_id: command.attempt_id,
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
      attempt_id: command.attempt_id,
    });
  }
  if (policy.configured !== true) {
    return decision({
      ok: false,
      status: "held",
      stage: "runtime_policy",
      reason: "runtime_policy_held:" + policy.reason,
      attempt_id: command.attempt_id,
    });
  }

  const root = serverRoot(env);
  if (!root || path.resolve(policy.root_dir) !== root) {
    return decision({
      ok: false,
      status: "held",
      stage: "runtime_policy",
      reason: "runtime_root_mismatch",
      attempt_id: command.attempt_id,
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
      attempt_id: command.attempt_id,
      credential_read_performed: true,
    });
  }

  if (factoryDecision.ok === false) {
    return decision({
      ok: false,
      status: "held",
      stage: "postgres_factory",
      reason: "postgres_factory_held:" + factoryDecision.reason,
      attempt_id: command.attempt_id,
      credential_read_performed:
        factoryDecision.credential_read_performed,
    });
  }

  let preChild =
    decision({
      ok: false,
      status: "held",
      stage: "claim",
      reason: "claim_not_reached",
      attempt_id: command.attempt_id,
      credential_read_performed: true,
    });
  let lease: BuyVoidPaymentKeyedDispatcherLeaseV1 | null = null;
  let closeFailed = false;

  try {
    let admission;
    try {
      admission =
        await admitBuyVoidPaymentKeyedDispatcherPostgresSchemaV1(
          factoryDecision,
        );
    } catch {
      preChild = decision({
        ok: false,
        status: "held",
        stage: "schema_admission",
        reason: "schema_admission_exception",
        attempt_id: command.attempt_id,
        credential_read_performed: true,
        schema_query_performed: true,
      });
      admission = null;
    }

    if (admission !== null) {
      if (admission.ok === false) {
        preChild = decision({
          ok: false,
          status: "held",
          stage: "schema_admission",
          reason: "schema_admission_held:" + admission.reason,
          attempt_id: command.attempt_id,
          credential_read_performed: true,
          schema_query_performed: admission.schema_query_performed,
        });
      } else if (
        admission.marker !==
          VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1 ||
        admission.authority !==
          VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_AUTHORITY_V1 ||
        admission.database_mutation_performed !== false ||
        admission.configuration_fingerprint_sha256 !==
          factoryDecision.configuration_fingerprint_sha256
      ) {
        preChild = decision({
          ok: false,
          status: "held",
          stage: "schema_admission",
          reason: "schema_admission_identity_mismatch",
          attempt_id: command.attempt_id,
          credential_read_performed: true,
          schema_query_performed: true,
        });
      } else {
        const store =
          createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
            pool: factoryDecision.pool,
          });

        let enqueue;
        try {
          enqueue =
            await enqueueBuyVoidPaymentKeyedPreparedAttemptV1({
              root_dir: root,
              attempt_id: command.attempt_id,
              client_id:
                VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CLIENT_ID_V1,
              store,
            });
        } catch {
          preChild = decision({
            ok: false,
            status: "held",
            stage: "enqueue",
            reason: "enqueue_exception",
            attempt_id: command.attempt_id,
            credential_read_performed: true,
            schema_query_performed: true,
            dispatcher_database_mutation_may_have_occurred: true,
          });
          enqueue = null;
        }

        if (enqueue !== null) {
          if (enqueue.ok !== true) {
            preChild = decision({
              ok: false,
              status: "held",
              stage: "enqueue",
              reason: "enqueue_" + enqueue.status + ":" + enqueue.reason,
              attempt_id: command.attempt_id,
              enqueue_status: enqueue.status,
              credential_read_performed: true,
              schema_query_performed: true,
              dispatcher_database_mutation_may_have_occurred:
                enqueue.dispatcher_submission_attempted === true,
            });
          } else {
            let claim;
            try {
              claim =
                await claimBuyVoidPaymentKeyedPreparedAttemptV1({
                  root_dir: root,
                  attempt_id: command.attempt_id,
                  worker_id:
                    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_WORKER_ID_V1,
                  store,
                });
            } catch {
              preChild = decision({
                ok: false,
                status: "held",
                stage: "claim",
                reason: "claim_exception",
                attempt_id: command.attempt_id,
                enqueue_status: enqueue.status,
                credential_read_performed: true,
                schema_query_performed: true,
                dispatcher_database_mutation_may_have_occurred: true,
              });
              claim = null;
            }

            if (claim !== null) {
              if (claim.ok === true && claim.status === "claimed") {
                lease = claim.lease;
                preChild = decision({
                  ok: false,
                  status: "held",
                  stage: "claim",
                  reason: "claim_ready_for_child",
                  attempt_id: command.attempt_id,
                  worker_id:
                    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_WORKER_ID_V1,
                  enqueue_status: enqueue.status,
                  claim_status: "claimed",
                  credential_read_performed: true,
                  schema_query_performed: true,
                  dispatcher_database_mutation_may_have_occurred: true,
                  lease_capability_issued: true,
                });
              } else {
                preChild = decision({
                  ok: false,
                  status: "held",
                  stage: "claim",
                  reason:
                    claim.ok === true
                      ? "claim_published_without_lease"
                      : "claim_" + claim.status + ":" + claim.reason,
                  attempt_id: command.attempt_id,
                  worker_id:
                    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_WORKER_ID_V1,
                  enqueue_status: enqueue.status,
                  claim_status: claim.status,
                  credential_read_performed: true,
                  schema_query_performed: true,
                  dispatcher_database_mutation_may_have_occurred:
                    claim.dispatcher_claim_attempted === true,
                  lease_capability_issued: false,
                });
              }
            }
          }
        }
      }
    }
  } catch {
    preChild = decision({
      ok: false,
      status: "held",
      stage: "claim",
      reason: "claim_composition_exception",
      attempt_id: command.attempt_id,
      credential_read_performed: true,
      schema_query_performed: true,
      dispatcher_database_mutation_may_have_occurred: true,
    });
  } finally {
    try {
      await factoryDecision.close();
    } catch {
      closeFailed = true;
    }
  }

  if (closeFailed) {
    return decision({
      ...preChild,
      ok: false,
      status: "held",
      stage: "claim_factory_close",
      reason: "claim_factory_close_failed",
      claim_factory_close_attempted: true,
      claim_factory_close_failed: true,
    });
  }

  preChild = decision({
    ...preChild,
    claim_factory_close_attempted: true,
    claim_factory_close_failed: false,
  });

  if (!lease) return preChild;

  let child: ChildDecisionV1;
  try {
    child =
      await runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1({
        lease,
      });
  } catch {
    return decision({
      ...preChild,
      ok: false,
      status: "reconciliation_required",
      stage: "child",
      reason: "admitted_child_exception_after_claim",
      child_invoked: true,
      dispatcher_database_mutation_may_have_occurred: true,
      money_movement_may_have_occurred: true,
    });
  }

  if (child.factory_close_failed === true) {
    return decision({
      ...preChild,
      ok: false,
      status:
        child.worker_invoked === true
          ? "reconciliation_required"
          : "held",
      stage: "child",
      reason: "admitted_child_factory_close_failed",
      child_invoked: true,
      child,
      dispatcher_database_mutation_may_have_occurred:
        true,
      broadcast_call_performed: child.broadcast_call_performed,
      transaction_broadcast_accepted:
        child.transaction_broadcast_accepted,
      money_movement_performed: child.money_movement_performed,
      money_movement_may_have_occurred:
        child.money_movement_may_have_occurred,
    });
  }

  return decision({
    ...preChild,
    ok: child.ok,
    status: child.status,
    stage: "child",
    reason: child.reason,
    attempt_id: child.attempt_id || command.attempt_id,
    worker_id:
      child.worker_id ||
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_WORKER_ID_V1,
    child_invoked: true,
    child,
    dispatcher_database_mutation_may_have_occurred:
      true,
    broadcast_call_performed: child.broadcast_call_performed,
    transaction_broadcast_accepted:
      child.transaction_broadcast_accepted,
    money_movement_performed: child.money_movement_performed,
    money_movement_may_have_occurred:
      child.money_movement_may_have_occurred,
  });
}
