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
    bounded_plain_data_snapshot_required: true,
    pre_serialization_resource_bound_verified: true,
    caller_accessor_or_tojson_authority: false,
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

const SNAPSHOT_MAX_BYTES_V1 = 256 * 1024;
const SNAPSHOT_MAX_DEPTH_V1 = 16;
const SNAPSHOT_MAX_NODES_V1 = 4096;
const SNAPSHOT_MAX_KEYS_V1 = 4096;
const SNAPSHOT_MAX_ARRAY_ITEMS_V1 = 1024;
const SNAPSHOT_MAX_KEY_CODE_UNITS_V1 = 256;
const SNAPSHOT_MAX_TEXT_CODE_UNITS_V1 = 32 * 1024;

type SnapshotBudgetV1 = {
  bytes: number;
  nodes: number;
  keys: number;
};

function jsonStringByteLengthV1(value: string): number {
  // Exact UTF-8 byte count of JSON.stringify(string), including quotes,
  // without constructing the escaped JSON string.
  let bytes = 2;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (
      code === 0x22 ||
      code === 0x5c ||
      code === 0x08 ||
      code === 0x09 ||
      code === 0x0a ||
      code === 0x0c ||
      code === 0x0d
    ) {
      bytes += 2;
      continue;
    }
    if (code <= 0x1f) {
      bytes += 6;
      continue;
    }
    if (code <= 0x7f) {
      bytes += 1;
      continue;
    }
    if (code <= 0x7ff) {
      bytes += 2;
      continue;
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      const next =
        index + 1 < value.length ? value.charCodeAt(index + 1) : -1;
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        // JSON.stringify escapes an unpaired surrogate as \udxxx.
        bytes += 6;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      bytes += 6;
      continue;
    }
    bytes += 3;
  }
  return bytes;
}

function addSnapshotBytesV1(
  budget: SnapshotBudgetV1,
  bytes: number,
  label: string,
): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    hold(label + "_invalid");
  }
  budget.bytes += bytes;
  if (budget.bytes > SNAPSHOT_MAX_BYTES_V1) {
    hold(label + "_size_exceeded");
  }
}

function detachedBoundedJsonValueV1(
  value: unknown,
  label: string,
  budget: SnapshotBudgetV1,
  depth: number,
): any {
  if (depth > SNAPSHOT_MAX_DEPTH_V1) {
    hold(label + "_depth_exceeded");
  }
  budget.nodes += 1;
  if (budget.nodes > SNAPSHOT_MAX_NODES_V1) {
    hold(label + "_node_count_exceeded");
  }

  if (value === null) {
    addSnapshotBytesV1(budget, 4, label);
    return null;
  }
  if (typeof value === "boolean") {
    addSnapshotBytesV1(budget, value ? 4 : 5, label);
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) hold(label + "_invalid_number");
    const encoded = Object.is(value, -0) ? "0" : String(value);
    addSnapshotBytesV1(budget, encoded.length, label);
    return value;
  }
  if (typeof value === "string") {
    if (value.length > SNAPSHOT_MAX_TEXT_CODE_UNITS_V1) {
      hold(label + "_text_size_exceeded");
    }
    addSnapshotBytesV1(budget, jsonStringByteLengthV1(value), label);
    return value;
  }
  if (!value || typeof value !== "object") {
    hold(label + "_unsupported_value");
  }
  if (utilTypes.isProxy(value)) {
    hold(label + "_proxy_forbidden");
  }

  const prototype = Object.getPrototypeOf(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);

  if (Array.isArray(value)) {
    if (prototype !== Array.prototype ||
        value.length > SNAPSHOT_MAX_ARRAY_ITEMS_V1) {
      hold(label + "_array_invalid");
    }
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.some((key) => typeof key === "symbol")) {
      hold(label + "_symbol_key_forbidden");
    }
    const stringKeys = ownKeys as string[];
    if (
      stringKeys.some((key) =>
        key !== "length" && !/^(0|[1-9][0-9]*)$/.test(key))
    ) {
      hold(label + "_array_property_invalid");
    }
    if (stringKeys.length !== value.length + 1) {
      hold(label + "_sparse_array_forbidden");
    }

    addSnapshotBytesV1(budget, 2 + Math.max(0, value.length - 1), label);
    const clone: any[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !Object.hasOwn(descriptor, "value") ||
          descriptor.enumerable !== true) {
        hold(label + "_accessor_or_nondata_property");
      }
      clone.push(
        detachedBoundedJsonValueV1(
          descriptor.value,
          label,
          budget,
          depth + 1,
        ),
      );
    }
    return clone;
  }

  if (prototype !== Object.prototype && prototype !== null) {
    hold(label + "_nonplain_object");
  }

  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key === "symbol")) {
    hold(label + "_symbol_key_forbidden");
  }
  const keys = ownKeys as string[];
  budget.keys += keys.length;
  if (budget.keys > SNAPSHOT_MAX_KEYS_V1) {
    hold(label + "_key_count_exceeded");
  }

  addSnapshotBytesV1(budget, 2 + Math.max(0, keys.length - 1), label);
  const clone: Record<string, any> = {};
  for (const key of keys) {
    if (key.length > SNAPSHOT_MAX_KEY_CODE_UNITS_V1) {
      hold(label + "_key_size_exceeded");
    }
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, "value") ||
        descriptor.enumerable !== true) {
      hold(label + "_accessor_or_nondata_property");
    }
    addSnapshotBytesV1(
      budget,
      jsonStringByteLengthV1(key) + 1,
      label,
    );
    Object.defineProperty(clone, key, {
      value: detachedBoundedJsonValueV1(
        descriptor.value,
        label,
        budget,
        depth + 1,
      ),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return clone;
}

function frozenJsonSnapshot(
  value: any,
  label: string,
): Readonly<Record<string, any>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold(label + "_invalid");
  }

  const budget: SnapshotBudgetV1 = { bytes: 0, nodes: 0, keys: 0 };
  const detached =
    detachedBoundedJsonValueV1(value, label, budget, 0);
  if (!detached || typeof detached !== "object" ||
      Array.isArray(detached)) {
    hold(label + "_invalid_json");
  }

  let raw: string;
  try {
    raw = JSON.stringify(detached);
  } catch {
    hold(label + "_serialization_failed");
  }
  if (
    Buffer.byteLength(raw, "utf8") !== budget.bytes ||
    budget.bytes > SNAPSHOT_MAX_BYTES_V1
  ) {
    hold(label + "_serialization_budget_mismatch");
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
