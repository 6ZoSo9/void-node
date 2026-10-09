import crypto from "node:crypto";
import { types as utilTypes } from "node:util";
import {
  observeBuyVoidCustodyPaymentLedgersReadOnlyV1,
} from "./buy_void_custody_payment_ledgers_observed_read_v1.mjs";
import {
  observeBuyVoidCustodyLaunchFilesReadOnlyV1,
} from "./buy_void_custody_launch_observed_read_v1.mjs";
import {
  observeBuyVoidCustodyAllocationRootsReadOnlyV1,
} from "./buy_void_custody_allocation_roots_observed_read_v1.mjs";
import {
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
} from "../../dist/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  planBuyVoidCustodyReserveFromObservedBytesV1,
} from "./buy_void_custody_reserve_plan_v1.mjs";

// Combine real descriptor-bound observations and original pure
// payment/launch/allocation logic. NOT an IPC reserve/recover implementation.
export const VOID_BUY_VOID_CUSTODY_READONLY_RESERVE_PREVIEW_V1 =
  "VOID_BUY_VOID_CUSTODY_READONLY_RESERVE_PREVIEW_V1";
export const VOID_BUY_VOID_CUSTODY_READONLY_RESERVE_PREVIEW_AUTHORITY_V1 =
  Object.freeze({
    source_only_unmounted: true,
    actual_payment_and_launch_descriptor_readers_reused: true,
    actual_allocation_ledger_and_high_water_descriptor_reader_reused: true,
    canonical_allocation_high_water_binding_reused: true,
    production_launch_v2_signature_classifier_reused: true,
    canonical_payment_replay_and_allocation_planner_reused: true,
    caller_green_flags_accepted: false,
    caller_clock_accepted: false,
    configured_private_roots_authorized_for_production: false,
    single_cross_root_lock_held: false,
    cross_root_atomic_snapshot_proven: false,
    remote_authenticated_custody_ipc: false,
    mounted_payment_route: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    filesystem_write: false,
    production_allocation_mutation_ready: false,
    presale_activation: false,
    funds_moved: false,
  });

const REQUEST = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;
const CONFIG_KEYS = Object.freeze([
  "activation_receipt_absolute_path",
  "allocation_high_water_root",
  "allocation_ledger_root",
  "custody_high_water_absolute_path",
  "request_dir",
  "request_id",
  "shared_data_dir",
]);

function held(reason, extra = {}) {
  return Object.freeze({
    marker: VOID_BUY_VOID_CUSTODY_READONLY_RESERVE_PREVIEW_V1,
    status: "held",
    ok: false,
    reason,
    request_id: null,
    allocation_record_id: null,
    would_plan_allocation: false,
    source_plan_candidate_sha256: null,
    ...extra,
    operation_performed: false,
    single_cross_root_lock_held: false,
    cross_root_atomic_snapshot_proven: false,
    remote_authenticated_custody_ipc: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    filesystem_write: false,
    production_allocation_mutation_ready: false,
    presale_activation: false,
    funds_moved: false,
  });
}
function options(raw) {
  if (!raw || typeof raw !== "object" || utilTypes.isProxy(raw) ||
      Array.isArray(raw) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(raw))) {
    throw new Error("preview_config_not_plain_data");
  }
  const actual = Reflect.ownKeys(raw);
  if (actual.length !== CONFIG_KEYS.length ||
      actual.some(key => typeof key !== "string" ||
        !CONFIG_KEYS.includes(key))) {
    throw new Error("preview_config_not_plain_data");
  }
  const result = Object.create(null);
  for (const key of CONFIG_KEYS) {
    const field = Object.getOwnPropertyDescriptor(raw, key);
    if (!field || !Object.hasOwn(field, "value") ||
        !field.enumerable || typeof field.value !== "string") {
      throw new Error("preview_config_not_plain_data");
    }
    result[key] = field.value;
  }
  if (!REQUEST.test(result.request_id)) {
    throw new Error("preview_request_id_invalid");
  }
  return Object.freeze(result);
}
function sha256(bytes) {
  return "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
}
export function previewBuyVoidCustodyReserveFromPrivateFilesReadOnlyV1(
  rawConfig = {},
) {
  let config;
  try { config = options(rawConfig); }
  catch { return held("config_unqualified"); }

  // The caller-supplied paths remain untrusted suggestions. An installed
  // custody service MUST later bind them to a root-owned server policy.
  const payment = observeBuyVoidCustodyPaymentLedgersReadOnlyV1({
    request_dir: config.request_dir,
  });
  if (payment?.observed !== true ||
      payment.cross_file_atomic_snapshot_verified !== false ||
      payment.filesystem_write !== false ||
      !Buffer.isBuffer(payment.requests_jsonl) ||
      !Buffer.isBuffer(payment.operator_events_jsonl)) {
    return held("payment_ledger_observation_held");
  }
  const launch = observeBuyVoidCustodyLaunchFilesReadOnlyV1({
    shared_data_dir: config.shared_data_dir,
    activation_receipt_absolute_path:
      config.activation_receipt_absolute_path,
    custody_high_water_absolute_path:
      config.custody_high_water_absolute_path,
  });
  if (launch?.observed !== true ||
      launch.cross_file_atomic_snapshot_verified !== false ||
      launch.custody_high_water_write_performed !== false ||
      !Buffer.isBuffer(launch.journal_bytes) ||
      !Buffer.isBuffer(launch.activation_receipt_bytes) ||
      !Buffer.isBuffer(launch.custody_high_water_bytes)) {
    return held("launch_evidence_observation_held");
  }
  const allocation = observeBuyVoidCustodyAllocationRootsReadOnlyV1({
    ledger_root: config.allocation_ledger_root,
    high_water_root: config.allocation_high_water_root,
  });
  if (allocation?.observed !== true ||
      allocation.cross_root_atomic_snapshot_proven !== false ||
      allocation.filesystem_write !== false ||
      !Buffer.isBuffer(allocation.allocation_jsonl) ||
      !Buffer.isBuffer(allocation.allocation_high_water_bytes)) {
    return held("allocation_evidence_observation_held");
  }

  // Never trust an allocation ledger without its exact associated high-water.
  // A matching current pair is a read-window observation, NOT a
  // cross-filesystem atomic snapshot, rollback-proof anchor or write lease.
  const binding = classifyBuyVoidAllocationReservationHighWaterBindingV1({
    ledger_jsonl: Buffer.from(allocation.allocation_jsonl),
    high_water_json: Buffer.from(allocation.allocation_high_water_bytes),
  });
  if (!binding || binding.ok !== true || binding.status !== "bound" ||
      binding.operation_performed !== false) {
    return held("allocation_ledger_high_water_binding_held");
  }
  const plan = planBuyVoidCustodyReserveFromObservedBytesV1({
    request_id: config.request_id,
    requests_jsonl: Buffer.from(payment.requests_jsonl),
    operator_events_jsonl: Buffer.from(payment.operator_events_jsonl),
    allocation_jsonl: Buffer.from(allocation.allocation_jsonl),
    generation_journal_bytes: Buffer.from(launch.journal_bytes),
    activation_receipt_bytes: Buffer.from(launch.activation_receipt_bytes),
    custody_high_water_bytes: Buffer.from(launch.custody_high_water_bytes),
  });
  if (!plan || plan.ready !== true ||
      !["planned", "idempotent"].includes(plan.status) ||
      plan.operation_performed !== false ||
      plan.filesystem_write !== false ||
      plan.allocation_write !== false ||
      typeof plan.next_ledger_jsonl !== "string") {
    return held("custody_signed_source_plan_held");
  }
  // A positive source plan is *still* only an uncommitted proposal. Do not
  // export raw customer-ledger bytes or treat this as a verified IPC mutation.
  return held("unmounted_cross_root_write_admission_required", {
    request_id: config.request_id,
    allocation_record_id: plan.allocation_record_id,
    would_plan_allocation: true,
    source_plan_candidate_sha256: sha256(
      Buffer.from(plan.next_ledger_jsonl, "utf8"),
    ),
  });
}
