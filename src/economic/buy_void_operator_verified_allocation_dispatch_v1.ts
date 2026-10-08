import path from "node:path";
import {
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
  writeBuyVoidVerifiedPaymentAllocationHandoffV1,
} from "./buy_void_verified_payment_capacity_admission_v1.js";

export const VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_V1 =
  "VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_V1";

const CANONICAL_OPERATOR_STATUSES_V1 = Object.freeze([
  "payment_verified",
  "reviewed",
  "fulfilled",
  "rejected",
] as const);

export const VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1 =
  "/var/lib/void-allocation-ledger-v1";
export const VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1 =
  "/var/lib/void-allocation-custody-v1";

function canonicalOperatorStatusV1(value: unknown):
  (typeof CANONICAL_OPERATOR_STATUSES_V1)[number] | null {
  if (typeof value !== "string") return null;
  return (CANONICAL_OPERATOR_STATUSES_V1 as readonly string[]).includes(value)
    ? value as (typeof CANONICAL_OPERATOR_STATUSES_V1)[number]
    : null;
}

export const VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    verified_payment_must_use_allocation_handoff: true,
    legacy_payment_only_writer_for_verified_payment_forbidden: true,
    server_controlled_roots_required: true,
    private_root_independent_custody_proven: false,
    custody_service_composed: false,
    direct_web_process_private_root_write_authority: false,
    mounted_operator_route_verified: false,
    operator_principal_authenticated: false,
    deployed_artifact_generation_verified: false,
    production_gate_ready: false,
    signing: false,
    transaction_broadcast: false,
    funds_movement: false,
  });

type LaunchMutationV1 = (
  request: any,
  operation: (assert_current_authority: () => any) => any,
) => Promise<any>;

export type BuyVoidOperatorAllocationDispatchInputV1 = {
  event: any;
  request: any;
  request_dir: string;
  // Only a reviewed server-side operator integration may supply these roots.
  // Do NOT take either root from HTTP query parameters or JSON request bodies.
  allocation_ledger_root?: string | null;
  allocation_high_water_root?: string | null;
  with_launch_authority_mutation: LaunchMutationV1;
  read_sale_state: () => Promise<any>;
};

function hold(reason: string): never {
  throw new Error("buy_void_operator_allocation_dispatch_" + reason);
}

function frozenJsonSnapshot(value: any, label: string): Readonly<Record<string, any>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold(label + "_invalid");
  }
  let raw: string;
  try {
    const result = JSON.stringify(value);
    if (typeof result !== "string") hold(label + "_invalid_json");
    raw = result;
  } catch {
    hold(label + "_serialization_failed");
  }
  if (Buffer.byteLength(raw, "utf8") > 256 * 1024) {
    hold(label + "_size_exceeded");
  }
  let clone: any;
  try {
    clone = JSON.parse(raw);
  } catch {
    hold(label + "_invalid_json");
  }
  if (!clone || typeof clone !== "object" || Array.isArray(clone)) {
    hold(label + "_invalid_json");
  }
  function freezeDeep(item: any): any {
    if (item && typeof item === "object" && !Object.isFrozen(item)) {
      for (const nested of Object.values(item)) freezeDeep(nested);
      Object.freeze(item);
    }
    return item;
  }
  return freezeDeep(clone) as Readonly<Record<string, any>>;
}

function absolutePrivateRoot(value: unknown): string {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    hold("allocation_roots_not_configured");
  }
  if (!path.isAbsolute(value) || path.resolve(value) !== value ||
      value === path.parse(value).root) {
    hold("allocation_root_path_not_absolute_normalized_private");
  }
  return value;
}

export function planBuyVoidOperatorAllocationDispatchV1(
  input: BuyVoidOperatorAllocationDispatchInputV1,
) {
  // Capture every caller-controlled property once. The returned frozen plan
  // is the only authority dispatch() may consume after validation.
  const rawEvent = input?.event;
  const rawRequest = input?.request;
  const requestDir = input?.request_dir;
  const allocationLedgerRootRaw = input?.allocation_ledger_root;
  const allocationHighWaterRootRaw = input?.allocation_high_water_root;
  const withLaunchAuthorityMutation = input?.with_launch_authority_mutation;
  const readSaleState = input?.read_sale_state;
  const event = frozenJsonSnapshot(rawEvent, "event");
  const request = frozenJsonSnapshot(rawRequest, "request");
  const requestId = String(event.request_id || "");
  const operatorStatus = canonicalOperatorStatusV1(event.operator_status);
  if (!requestId || requestId !== String(request.request_id || "") ||
      !operatorStatus ||
      typeof requestDir !== "string" || !requestDir.trim() ||
      typeof withLaunchAuthorityMutation !== "function" ||
      typeof readSaleState !== "function") {
    hold("request_event_identity_status_or_server_callbacks_invalid");
  }
  if (operatorStatus !== "payment_verified") {
    return Object.freeze({
      kind: "nonpayment_legacy_writer" as const,
      event,
      request,
      request_dir: requestDir,
      with_launch_authority_mutation: withLaunchAuthorityMutation,
      read_sale_state: readSaleState,
    });
  }
  const allocationLedgerRoot = absolutePrivateRoot(allocationLedgerRootRaw);
  const allocationHighWaterRoot =
    absolutePrivateRoot(allocationHighWaterRootRaw);
  if (
    allocationLedgerRoot !== VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1 ||
    allocationHighWaterRoot !==
      VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1
  ) {
    hold("allocation_roots_not_canonical");
  }
  return Object.freeze({
    kind: "verified_payment_allocation_handoff" as const,
    event,
    request,
    request_dir: requestDir,
    allocation_ledger_root: allocationLedgerRoot,
    allocation_high_water_root: allocationHighWaterRoot,
    with_launch_authority_mutation: withLaunchAuthorityMutation,
    read_sale_state: readSaleState,
  });
}

// NOT MOUNTED: future hardened operator-router work must separately prove
// authentication, exact server custody roots, allocation witness, and the
// applied route-to-writer identity before switching production traffic.
export async function dispatchBuyVoidOperatorEventWithAllocationRequiredV1(
  input: BuyVoidOperatorAllocationDispatchInputV1,
) {
  const plan = planBuyVoidOperatorAllocationDispatchV1(input);
  const common = {
    event: plan.event,
    request: plan.request,
    request_dir: plan.request_dir,
    with_launch_authority_mutation: plan.with_launch_authority_mutation,
    read_sale_state: plan.read_sale_state,
  };
  if (plan.kind === "verified_payment_allocation_handoff") {
    return writeBuyVoidVerifiedPaymentAllocationHandoffV1({
      ...common,
      allocation_ledger_root: plan.allocation_ledger_root,
      allocation_high_water_root: plan.allocation_high_water_root,
    });
  }
  return writeBuyVoidOperatorEventWithCapacityAdmissionV1(common);
}
