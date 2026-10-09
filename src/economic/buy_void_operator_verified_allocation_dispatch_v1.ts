import path from "node:path";
import { types as utilTypes } from "node:util";
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
    pre_serialization_plain_data_bound: true,
    accessor_or_tojson_input_allowed: false,
    proxy_input_allowed: false,
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

const SNAPSHOT_MAX_BYTES = 256 * 1024;
const SNAPSHOT_MAX_DEPTH = 16;
const SNAPSHOT_MAX_NODES = 4096;
const SNAPSHOT_MAX_KEYS_PER_OBJECT = 256;
const SNAPSHOT_MAX_ARRAY_LENGTH = 4096;
const SNAPSHOT_MAX_KEY_CODE_UNITS = 4096;
const SNAPSHOT_MAX_STRING_CODE_UNITS = 64 * 1024;

type SnapshotBudgetV1 = {
  bytes: number;
  nodes: number;
};

function addSnapshotBudgetV1(
  budget: SnapshotBudgetV1,
  amount: number,
  label: string,
): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    hold(label + "_budget_invalid");
  }
  budget.bytes += amount;
  if (
    !Number.isSafeInteger(budget.bytes) ||
    budget.bytes > SNAPSHOT_MAX_BYTES
  ) {
    hold(label + "_size_exceeded");
  }
}

function addSnapshotStringUpperBoundV1(
  budget: SnapshotBudgetV1,
  value: string,
  maximumCodeUnits: number,
  label: string,
): void {
  if (value.length > maximumCodeUnits) {
    hold(label + "_text_too_large");
  }
  // JSON string escaping consumes at most six ASCII bytes per UTF-16 code
  // unit, plus quotes. This is deliberately conservative so the later
  // serialization of the safe clone cannot exceed the admitted budget.
  addSnapshotBudgetV1(budget, 2 + value.length * 6, label);
}

function cloneBoundedPlainJsonValueV1(
  value: unknown,
  label: string,
  budget: SnapshotBudgetV1,
  active: WeakSet<object>,
  depth: number,
): any {
  if (depth > SNAPSHOT_MAX_DEPTH) {
    hold(label + "_depth_exceeded");
  }
  budget.nodes += 1;
  if (budget.nodes > SNAPSHOT_MAX_NODES) {
    hold(label + "_node_count_exceeded");
  }

  if (value === null) {
    addSnapshotBudgetV1(budget, 4, label);
    return null;
  }
  if (typeof value === "string") {
    addSnapshotStringUpperBoundV1(
      budget,
      value,
      SNAPSHOT_MAX_STRING_CODE_UNITS,
      label,
    );
    return value;
  }
  if (typeof value === "boolean") {
    addSnapshotBudgetV1(budget, 5, label);
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) hold(label + "_number_invalid");
    addSnapshotBudgetV1(budget, 32, label);
    return value;
  }
  if (!value || typeof value !== "object") {
    hold(label + "_value_type_invalid");
  }
  if (utilTypes.isProxy(value)) {
    hold(label + "_proxy_forbidden");
  }

  const objectValue = value as object;
  if (active.has(objectValue)) {
    hold(label + "_cycle_forbidden");
  }
  active.add(objectValue);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        hold(label + "_array_prototype_invalid");
      }
      if (value.length > SNAPSHOT_MAX_ARRAY_LENGTH) {
        hold(label + "_array_length_exceeded");
      }
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Reflect.ownKeys(descriptors);
      if (keys.some((key) => typeof key !== "string")) {
        hold(label + "_symbol_key_forbidden");
      }
      const elementKeys = (keys as string[]).filter(
        (key) => key !== "length",
      );
      if (elementKeys.length !== value.length) {
        hold(label + "_array_shape_invalid");
      }
      addSnapshotBudgetV1(budget, 2, label);
      const out: any[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (
          !descriptor ||
          descriptor.enumerable !== true ||
          !Object.hasOwn(descriptor, "value")
        ) {
          hold(label + "_array_accessor_or_hole_forbidden");
        }
        if (index !== 0) addSnapshotBudgetV1(budget, 1, label);
        out.push(
          cloneBoundedPlainJsonValueV1(
            descriptor.value,
            label,
            budget,
            active,
            depth + 1,
          ),
        );
      }
      return Object.freeze(out);
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      hold(label + "_prototype_invalid");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string")) {
      hold(label + "_symbol_key_forbidden");
    }
    if (keys.length > SNAPSHOT_MAX_KEYS_PER_OBJECT) {
      hold(label + "_key_count_exceeded");
    }

    addSnapshotBudgetV1(budget, 2, label);
    const out: Record<string, any> = Object.create(null);
    let index = 0;
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        hold(label + "_accessor_or_hidden_property_forbidden");
      }
      if (key === "toJSON" && typeof descriptor.value === "function") {
        hold(label + "_tojson_forbidden");
      }
      if (index !== 0) addSnapshotBudgetV1(budget, 1, label);
      addSnapshotStringUpperBoundV1(
        budget,
        key,
        SNAPSHOT_MAX_KEY_CODE_UNITS,
        label,
      );
      addSnapshotBudgetV1(budget, 1, label);
      Object.defineProperty(out, key, {
        value: cloneBoundedPlainJsonValueV1(
          descriptor.value,
          label,
          budget,
          active,
          depth + 1,
        ),
        enumerable: true,
        writable: false,
        configurable: false,
      });
      index += 1;
    }
    return Object.freeze(out);
  } finally {
    active.delete(objectValue);
  }
}

function frozenJsonSnapshot(
  value: any,
  label: string,
): Readonly<Record<string, any>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold(label + "_invalid");
  }
  const budget: SnapshotBudgetV1 = { bytes: 0, nodes: 0 };
  const clone = cloneBoundedPlainJsonValueV1(
    value,
    label,
    budget,
    new WeakSet<object>(),
    0,
  );
  if (!clone || typeof clone !== "object" || Array.isArray(clone)) {
    hold(label + "_invalid_json");
  }

  // Only serialize the detached inert clone after the conservative encoded
  // upper bound has passed. No caller getter, toJSON function or Proxy can run
  // here, and this allocation is bounded by SNAPSHOT_MAX_BYTES.
  let raw: string;
  try {
    raw = JSON.stringify(clone);
  } catch {
    hold(label + "_safe_clone_serialization_failed");
  }
  if (Buffer.byteLength(raw, "utf8") > SNAPSHOT_MAX_BYTES) {
    hold(label + "_size_exceeded");
  }
  return clone as Readonly<Record<string, any>>;
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
