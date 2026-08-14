import type {
  BuyVoidErc20TransactionPreparationPlannerInputV1,
  BuyVoidErc20TransactionPreparationPlanReadyV1,
  BuyVoidErc20TransactionPreparationPlanHeldV1,
} from "./buy_void_erc20_transaction_preparation_planner_v1.js";
import type {
  BuyVoidErc20DeliveryReceiptReconcilerInputV1,
  BuyVoidErc20DeliveryReceiptReconcilerDecisionV1,
} from "./buy_void_erc20_delivery_receipt_reconciler_v1.js";
import type {
  BuyVoidCrashConsistentSagaServerPolicyDecisionV1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import type {
  BuyVoidErc20ExecutionCompositionPolicyV1,
} from "./buy_void_erc20_execution_composition_v1.js";
import type {
  ReserveBuyVoidInventoryInputV1,
  BuyVoidInventoryReservationDecisionV1,
} from "./buy_void_inventory_reservation_journal_v1.js";

type Erc20PlannerDecisionCompatV1 =
  | (BuyVoidErc20TransactionPreparationPlanReadyV1 & {
      reason?: never;
      detail?: never;
    })
  | BuyVoidErc20TransactionPreparationPlanHeldV1;

type Erc20ReceiptDecisionCompatV1 =
  | (Extract<BuyVoidErc20DeliveryReceiptReconcilerDecisionV1, { ok: true }> & {
      reason?: never;
      detail?: never;
    })
  | Extract<BuyVoidErc20DeliveryReceiptReconcilerDecisionV1, { ok: false }>;

type ExecutionCompositionPolicyDecisionCompatV1 =
  | {
      ok: true;
      status: "configured";
      policy: BuyVoidErc20ExecutionCompositionPolicyV1;
      missing_envs: [];
      reason?: never;
      detail?: never;
    }
  | {
      ok: false;
      status: "held";
      reason: string;
      missing_envs: string[];
      detail?: Record<string, unknown>;
    };

type InventoryReservationDecisionCompatV1 =
  | (Extract<BuyVoidInventoryReservationDecisionV1, { ok: true }> & {
      reason?: never;
      detail?: never;
    })
  | Extract<BuyVoidInventoryReservationDecisionV1, { ok: false }>;

type SagaPolicyDecisionCompatV1 =
  | (Extract<BuyVoidCrashConsistentSagaServerPolicyDecisionV1, { ok: true }> & {
      detail?: never;
    })
  | Extract<BuyVoidCrashConsistentSagaServerPolicyDecisionV1, { ok: false }>;

declare module "./buy_void_erc20_execution_composition_v1.js" {
  export function readBuyVoidErc20ExecutionCompositionPolicyV1(
    env?: NodeJS.ProcessEnv,
  ): ExecutionCompositionPolicyDecisionCompatV1;
}

declare module "./buy_void_inventory_reservation_journal_v1.js" {
  export function reserveBuyVoidInventoryV1(
    input: ReserveBuyVoidInventoryInputV1,
  ): InventoryReservationDecisionCompatV1;
}

declare module "./buy_void_erc20_transaction_preparation_planner_v1.js" {
  export function runBuyVoidErc20TransactionPreparationPlannerV1(
    input: BuyVoidErc20TransactionPreparationPlannerInputV1,
  ): Promise<Erc20PlannerDecisionCompatV1>;
}

declare module "./buy_void_erc20_delivery_receipt_reconciler_v1.js" {
  export function runBuyVoidErc20DeliveryReceiptReconcilerV1(
    input: BuyVoidErc20DeliveryReceiptReconcilerInputV1,
  ): Promise<Erc20ReceiptDecisionCompatV1>;
}

declare module "./buy_void_crash_consistent_saga_server_policy_v1.js" {
  export function readBuyVoidCrashConsistentSagaServerPolicyV1(
    env?: NodeJS.ProcessEnv,
  ): SagaPolicyDecisionCompatV1;
}

export {};
