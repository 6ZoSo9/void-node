import {
  runBuyVoidPaymentKeyedTerminalCloseoutV1,
  type BuyVoidPaymentKeyedTerminalCloseoutDecisionV1,
  type BuyVoidPaymentKeyedTerminalCloseoutInputV1,
} from "./buy_void_payment_keyed_terminal_closeout_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1,
} from "./buy_void_history_carrier_runtime_binding_v1.js";
import {
  refreshBuyVoidHistoryCarrierAfterTerminalV1,
  type BuyVoidHistoryCarrierLifecycleDecisionV1,
} from "./buy_void_history_carrier_lifecycle_mount_v1.js";

export const VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_V1 =
  "VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_V1";

export const VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_AUTHORITY_V1 =
  Object.freeze({
    terminal_closeout_history_refresh_mounted: true,
    authority_root_required_before_closeout_apply: true,
    durable_closeout_before_history_refresh: true,
    duplicate_closeout_repairs_missing_refresh: true,
    inventory_consumption_replay_forbidden: true,
    signing_replay_forbidden: true,
    transaction_broadcast_replay_forbidden: true,
    carrier_refresh_zero_unit: true,
    runtime_enablement: false,
    apply_enablement: false,
    public_activation: false,
    credential_content_read: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    funds_movement: false,
    automatic_retry: false,
  });

export type BuyVoidPaymentKeyedTerminalCloseoutWithHistoryCarrierDecisionV1 =
  | (BuyVoidPaymentKeyedTerminalCloseoutDecisionV1 & {
      history_carrier_refresh?:
        BuyVoidHistoryCarrierLifecycleDecisionV1;
    })
  | {
      ok: false;
      status: "held";
      applied: true;
      marker:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_V1;
      version: 1;
      stage:
        | "history_carrier_preflight"
        | "history_carrier_refresh";
      reason: string;
      mutation_performed: boolean;
      inventory_consumption_performed: boolean;
      public_request_fulfilled: boolean;
      saga_closeout_appended: boolean;
      credential_access_performed: false;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      history_carrier_refresh?:
        BuyVoidHistoryCarrierLifecycleDecisionV1;
    };

function preflightHeld(
  reason: string,
): BuyVoidPaymentKeyedTerminalCloseoutWithHistoryCarrierDecisionV1 {
  return {
    ok: false,
    status: "held",
    applied: true,
    marker:
      VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_V1,
    version: 1,
    stage: "history_carrier_preflight",
    reason,
    mutation_performed: false,
    inventory_consumption_performed: false,
    public_request_fulfilled: false,
    saga_closeout_appended: false,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}

export async function runBuyVoidPaymentKeyedTerminalCloseoutWithHistoryCarrierV1(
  input: BuyVoidPaymentKeyedTerminalCloseoutInputV1,
  env: NodeJS.ProcessEnv = process.env,
): Promise<
  BuyVoidPaymentKeyedTerminalCloseoutWithHistoryCarrierDecisionV1
> {
  const authorityRoot = String(
    env[
      VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1
    ] || "",
  ).trim();

  if (input.apply === true && !authorityRoot) {
    return preflightHeld(
      "history_carrier_authority_root_required_before_terminal_closeout",
    );
  }

  const closeout =
    await runBuyVoidPaymentKeyedTerminalCloseoutV1(input);
  if (
    input.apply !== true ||
    !closeout.ok ||
    closeout.status === "dry_run"
  ) {
    return closeout;
  }

  const refresh =
    refreshBuyVoidHistoryCarrierAfterTerminalV1({
      root_dir: input.root_dir,
      authority_root: authorityRoot,
      pool_id:
        VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1,
      payment_key_sha256:
        closeout.confirmed_state.payment_key_sha256,
    });
  if (!refresh.ok) {
    return {
      ok: false,
      status: "held",
      applied: true,
      marker:
        VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_V1,
      version: 1,
      stage: "history_carrier_refresh",
      reason: refresh.reason,
      mutation_performed:
        closeout.inventory_consumption_performed ||
        closeout.public_request_fulfilled ||
        closeout.saga_closeout_appended,
      inventory_consumption_performed:
        closeout.inventory_consumption_performed,
      public_request_fulfilled:
        closeout.public_request_fulfilled,
      saga_closeout_appended:
        closeout.saga_closeout_appended,
      credential_access_performed: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
      history_carrier_refresh: refresh,
    };
  }

  return {
    ...closeout,
    history_carrier_refresh: refresh,
  };
}
