import crypto from "node:crypto";
import path from "node:path";
import type {
  BuyVoidConfirmedCloseoutPlanV1,
  BuyVoidInventoryConsumptionRecordV1,
  BuyVoidPublicFulfillmentCloseoutEventV1,
} from "./buy_void_confirmed_closeout_v1.js";
import type { BuyVoidConfirmedStateV1 } from "./buy_void_confirmed_state_journal_v1.js";
import type { BuyVoidSagaTerminalCloseoutServerPolicyV1 } from "./buy_void_saga_terminal_closeout_server_policy_v1.js";

export const VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1 =
  "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1";
export const VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1 =
  "buyVoidAdvanceSagaTerminalCloseoutV1";

export const VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  background_loop: false,
  startup_execution: false,
  exact_saga_selector: true,
  exact_confirmed_state_completion_required: true,
  exact_confirmed_state_request_index_required: true,
  canonical_confirmed_state_id_binding: true,
  canonical_confirmed_state_fingerprint_binding: true,
  request_scoped_crash_recoverable_lock: true,
  deterministic_closeout_plan_persistence: true,
  exact_terminal_plan_fingerprint_required_before_mutation: true,
  terminal_plan_revalidation_inside_request_lock: true,
  shared_operator_event_writer_lock: true,
  append_only_inventory_consumption: true,
  atomic_public_operator_journal_projection: true,
  saga_closeout_committed_append: true,
  public_request_base_record_mutation: false,
  reservation_base_record_mutation: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  money_movement: false,
} as const;

export const TERMINAL_CLOSEOUT_SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
export const TERMINAL_CLOSEOUT_SHA256 = /^[0-9a-f]{64}$/;
export const TERMINAL_CLOSEOUT_TX_HASH = /^0x[0-9a-f]{64}$/;
export const TERMINAL_CLOSEOUT_ADDRESS = /^0x[0-9a-f]{40}$/;
export const TERMINAL_CLOSEOUT_SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;
export const TERMINAL_CLOSEOUT_SAGA_ROOT =
  "buy-void-crash-consistent-saga-runtime-v1";
export const TERMINAL_CLOSEOUT_ROOT = "buy-void-saga-terminal-closeout-v1";
export const TERMINAL_CLOSEOUT_LEASE_TTL_MS = 30_000;

export type BuyVoidSagaTerminalCloseoutFaultStageV1 =
  | "after_request_lock_before_plan_revalidation"
  | "after_plan_before_inventory"
  | "after_inventory_before_public"
  | "after_public_before_saga";

export type SagaStoreV1 = {
  recover: (sagaId: string) => any | null;
};
export type SagaModuleV1 = {
  ADVANCE_CONFIRMATION: string;
  ACTION_CONFIRMATIONS: Record<string, string>;
  createFilesystemSagaStoreV1: (rootDir: string) => SagaStoreV1;
  deriveSagaNextActionV1: (state: Record<string, unknown>) => {
    action: string | null;
    terminal: boolean;
    required_confirmation: string | null;
  };
  runSagaSupervisorTickV1: (input: Record<string, unknown>) => Promise<any>;
};

export type BuyVoidSagaTerminalCloseoutDependenciesV1 = {
  load_saga_module?: () => Promise<SagaModuleV1>;
  list_attempts?: (rootDir: string) => any[];
  list_inventory?: (input: { root_dir: string; pool_id: string }) => any[];
  resolve_confirmed_states?: (
    rootDir: string,
    requestId: string,
  ) => BuyVoidConfirmedStateV1[];
  plan_closeout?: (input: any) => any;
  write_inventory_consumption?: (input: any) => any;
  now_ms?: () => number;
  fault_inject?: (stage: BuyVoidSagaTerminalCloseoutFaultStageV1) => void;
};

export type RunBuyVoidSagaTerminalCloseoutInputV1 = {
  root_dir: string;
  saga_id: string;
  apply?: boolean;
  confirmation?: unknown;
  policy_fingerprint_sha256?: unknown;
  expected_plan_fingerprint_sha256?: unknown;
  saga_confirmation?: unknown;
  saga_action_confirmation?: unknown;
  dependencies?: BuyVoidSagaTerminalCloseoutDependenciesV1;
};

export type BuyVoidSagaTerminalCloseoutPublicEventV1 =
  BuyVoidPublicFulfillmentCloseoutEventV1 & {
    terminal_closeout_schema: "void_buy_void_saga_terminal_closeout_event_v1";
    terminal_closeout_marker: typeof VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1;
    terminal_closeout_version: 1;
    saga_id: string;
    closeout_id: string;
    canonical_confirmed_state_id: string;
    canonical_confirmed_state_fingerprint: string;
    canonical_confirmed_state_completion_final: true;
    inventory_consumption_terminal_fingerprint_sha256: string;
    public_event_fingerprint_sha256: string;
  };

export type BuyVoidSagaTerminalInventoryConsumptionV1 =
  BuyVoidInventoryConsumptionRecordV1 & {
    terminal_closeout_schema:
      "void_buy_void_saga_terminal_inventory_consumption_v1";
    terminal_closeout_marker: typeof VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1;
    terminal_closeout_version: 1;
    saga_id: string;
    closeout_id: string;
    canonical_confirmed_state_id: string;
    canonical_confirmed_state_fingerprint: string;
    canonical_confirmed_state_completion_final: true;
    terminal_closeout_fingerprint_sha256: string;
  };

export type BuyVoidSagaTerminalCloseoutPlanV1 = {
  schema: "void_buy_void_saga_terminal_closeout_plan_v1";
  marker: typeof VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1;
  version: 1;
  closeout_id: string;
  plan_fingerprint_sha256: string;
  saga_id: string;
  request_id: string;
  attempt_id: string;
  reservation_id: string;
  transaction_hash: string;
  canonical_confirmed_state_id: string;
  canonical_confirmed_state_fingerprint: string;
  server_policy_fingerprint_sha256: string;
  inventory_consumption: BuyVoidSagaTerminalInventoryConsumptionV1;
  public_closeout_event: BuyVoidSagaTerminalCloseoutPublicEventV1;
  base_closeout_plan: BuyVoidConfirmedCloseoutPlanV1;
  inventory_decrement_required: true;
  public_request_fulfilled_required: true;
  public_request_base_record_mutation_authorized: false;
  reservation_base_record_mutation_authorized: false;
  credential_access_authorized: false;
  wallet_access_authorized: false;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  money_movement_authorized: false;
};

export type ReconstructedTerminalCloseoutV1 = {
  root_dir: string;
  saga_module: SagaModuleV1;
  saga_store: SagaStoreV1;
  saga_record: any;
  policy: BuyVoidSagaTerminalCloseoutServerPolicyV1;
  attempt: any;
  confirmed_state: BuyVoidConfirmedStateV1;
  inventory_reservation: any;
  request: Record<string, any>;
  operator_events: Array<Record<string, any>>;
  effective_status: string;
  existing_fulfilled_event: Record<string, any> | null;
  plan: BuyVoidSagaTerminalCloseoutPlanV1;
};

export type BuyVoidSagaTerminalCloseoutDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      saga_id: string;
      attempt_id: string;
      closeout_id: string;
      plan: BuyVoidSagaTerminalCloseoutPlanV1;
      required_confirmation:
        typeof VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1;
      required_policy_fingerprint_sha256: string;
      required_plan_fingerprint_sha256: string;
      required_saga_confirmation: string;
      required_saga_action_confirmation: string;
      inventory_consumption_performed: false;
      public_request_fulfilled: false;
      saga_closeout_appended: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "closed" | "duplicate" | "recovered_partial";
      applied: true;
      mutation_performed: boolean;
      saga_id: string;
      attempt_id: string;
      closeout_id: string;
      plan: BuyVoidSagaTerminalCloseoutPlanV1;
      saga_state: Record<string, unknown>;
      inventory_consumption_performed: boolean;
      public_request_fulfilled: true;
      saga_closeout_appended: boolean;
      automatic_retry_allowed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      stage:
        | "input"
        | "server_policy"
        | "saga_reconstruction"
        | "canonical_confirmed_state"
        | "journal_reconstruction"
        | "closeout_plan"
        | "closeout_lock"
        | "inventory_consumption"
        | "public_closeout"
        | "saga_append";
      reason: string;
      detail?: Record<string, unknown>;
      mutation_performed: boolean;
      inventory_consumption_performed: boolean;
      public_request_fulfilled: boolean;
      saga_closeout_appended: boolean;
      automatic_retry_allowed: false;
      money_movement_performed: false;
    };

export function terminalText(value: unknown): string {
  return String(value ?? "").trim();
}
export function terminalSha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
export function terminalCanonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(terminalCanonical).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(
    (key) => `${JSON.stringify(key)}:${terminalCanonical(record[key])}`,
  ).join(",")}}`;
}
export function terminalFingerprint(value: unknown): string {
  return terminalSha256(terminalCanonical(value));
}
export function terminalSafeRoot(value: unknown): string {
  const raw = terminalText(value);
  if (!raw || raw.includes("\0") || !path.isAbsolute(raw)) return "";
  const resolved = path.resolve(raw);
  return resolved === path.parse(resolved).root ? "" : resolved;
}
export function terminalHash(value: unknown): string {
  const hash = terminalText(value).toLowerCase();
  return TERMINAL_CLOSEOUT_TX_HASH.test(hash) ? hash : "";
}
export function terminalAddress(value: unknown): string {
  const address = terminalText(value).toLowerCase();
  return TERMINAL_CLOSEOUT_ADDRESS.test(address) ? address : "";
}
export function terminalNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Date.now();
}
