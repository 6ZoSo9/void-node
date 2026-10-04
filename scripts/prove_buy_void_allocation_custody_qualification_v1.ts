#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
  planBuyVoidAllocationReservationV1,
} from "../src/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../src/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_RECEIPT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_REVIEWED_WRITER_HEAD_V1,
  classifyBuyVoidAllocationCustodyQualificationV1,
  type BuyVoidAllocationCustodyReceiptV1,
} from "../src/economic/buy_void_allocation_custody_qualification_v1.js";

const sha = (digit: string): string =>
  "sha256:" + digit.repeat(64);

function requireOk<T>(
  value: T,
): Extract<T, { ok: true }> {
  const runtime = value as T & {
    ok: boolean;
    reason?: string;
  };
  if (runtime.ok !== true) {
    throw new Error(runtime.reason ?? "unexpected_hold");
  }
  return value as Extract<T, { ok: true }>;
}

function expectHeld(
  value: ReturnType<
    typeof classifyBuyVoidAllocationCustodyQualificationV1
  >,
  reason: string,
): void {
  assert.equal(value.ok, false);
  if (value.ok) throw new Error("expected custody HOLD");
  assert.equal(value.status, "held");
  assert.equal(value.reason, reason);
  assert.equal(value.qualification_id_sha256, null);
  assert.equal(value.independent_custody_proven, false);
  assert.equal(value.production_gate_ready, false);
  assert.equal(value.operation_performed, false);
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("proof_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function ancestor(
  pathValue: string,
  dev: string,
  ino: string,
): Record<string, unknown> {
  return {
    path: pathValue,
    dev,
    ino,
    uid: 0,
    gid: 0,
    mode: "0755",
    symlink: false,
    runtime_write: false,
    runtime_rename: false,
    runtime_recreate: false,
  };
}

function mount(
  target: string,
  source: string,
  uuid: string,
  majorMinor: string,
): Record<string, unknown> {
  return {
    medium_present: true,
    mount_target: target,
    mount_source: source,
    mount_uuid: uuid,
    major_minor: majorMinor,
    filesystem_type: "ext4",
    statfs_type: "0xef53",
    mount_options: ["nodev", "noexec", "nosuid", "rw"],
  };
}

function storageRoot(
  resolved: string,
  dev: string,
  ino: string,
  source: string,
  uuid: string,
  majorMinor: string,
): Record<string, unknown> {
  return {
    resolved_path: resolved,
    dev,
    ino,
    uid: 2001,
    gid: 2001,
    mode: "0700",
    symlink: false,
    runtime_write: false,
    runtime_rename: false,
    runtime_recreate: false,
    ancestors: [
      ancestor("/", "1", "2"),
      ancestor("/var", "1", "10"),
      ancestor("/var/lib", "1", "11"),
    ],
    mount: mount(
      resolved,
      source,
      uuid,
      majorMinor,
    ),
  };
}

function hostEvidence(): Record<string, unknown> {
  const ledgerRoot = "/var/lib/void-allocation-ledger-v1";
  const custodyRoot = "/var/lib/void-allocation-custody-v1";
  return {
    host_id: "precision-mainnet0",
    runtime_uid: 1001,
    runtime_gid: 1001,
    custody_uid: 2001,
    custody_gid: 2001,
    ledger_root: storageRoot(
      ledgerRoot,
      "2049",
      "5001",
      "/dev/mapper/void-ledger",
      "11111111-1111-1111-1111-111111111111",
      "253:10",
    ),
    custody_root: storageRoot(
      custodyRoot,
      "2050",
      "6001",
      "/dev/mapper/void-custody",
      "22222222-2222-2222-2222-222222222222",
      "253:11",
    ),
    socket: {
      resolved_path:
        "/run/void-allocation-custody-v1/custody.sock",
      parent_path: "/run/void-allocation-custody-v1",
      parent_uid: 2001,
      parent_gid: 3001,
      parent_mode: "0750",
      parent_symlink: false,
      owner_uid: 2001,
      group_gid: 3001,
      mode: "0660",
      direct_socket: true,
      symlink_ancestors: false,
      server_controlled_path: true,
      runtime_connect_allowed: true,
      runtime_replace_denied: true,
      runtime_member_of_connect_group: true,
      custody_member_of_connect_group: true,
      exact_request_schema: true,
      exact_response_schema: true,
      max_request_bytes: 65536,
      max_response_bytes: 65536,
      response_timeout_ms: 5000,
      arbitrary_path_write: false,
      arbitrary_bytes_write: false,
      caller_selected_generation: false,
      automatic_retry: false,
    },
    service_policy: {
      user_uid: 2001,
      group_gid: 2001,
      umask: "0077",
      no_new_privileges: true,
      private_tmp: true,
      private_devices: true,
      protect_system: "strict",
      protect_home: "true",
      protect_kernel_tunables: true,
      protect_kernel_modules: true,
      protect_control_groups: true,
      lock_personality: true,
      restrict_suid_sgid: true,
      restrict_realtime: true,
      capability_bounding_set: [],
      ambient_capabilities: [],
      restrict_address_families: ["AF_UNIX"],
      read_write_paths: [
        custodyRoot,
        ledgerRoot,
      ].sort(),
      runtime_can_control_service: false,
    },
    fallback_storage_enabled: false,
    custody_medium_absence_holds: true,
  };
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .reverse()
        .map(([key, nested]) => [
          key,
          reverseObjectKeys(nested),
        ]),
    );
  }
  return value;
}

const emptyHigh = requireOk(
  deriveBuyVoidAllocationReservationHighWaterV1(""),
);
assert.equal(emptyHigh.high_water.record_count, 0);
assert.equal(
  emptyHigh.high_water.tip_hash,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
);

const baseInput = {
  ledger_jsonl: "",
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  payment_transaction_hash: "0x" + "a".repeat(64),
  payment_log_index: 7,
  launch_authority: {
    marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: sha("a"),
    source_composition_id: sha("b"),
    activation_generation: "0x" + "c".repeat(64),
    generation_tip_sha256: sha("d"),
    activation_receipt_id: "voidbclive1_" + "e".repeat(64),
    activation_receipt_sha256: "f".repeat(64),
    expires_at_ms: 1_800_000_300_000,
  },
  buyer_delivery_wallet: "0x" + "1".repeat(40),
  quote_void_amount: "6",
  quote_usdc_amount: "3",
  pool_void_total: "10000000",
  verified_payment_receipt_ref: sha("1"),
  payment_verified_event_sha256: sha("0"),
  duplicate_payment_guard_result: sha("2"),
  inventory_allocation_guard_result: sha("3"),
  operator_activation_record_ref: sha("4"),
  created_at_ms: 1_800_000_000_000,
  verified_payment_gate_green: true,
  duplicate_payment_guard_green: true,
  inventory_allocation_guard_green: true,
  operator_activation_record_green: true,
} as const;

const first = requireOk(
  planBuyVoidAllocationReservationV1(baseInput),
);
const ledger1 = first.next_ledger_jsonl;
const high1 = requireOk(
  deriveBuyVoidAllocationReservationHighWaterV1(ledger1),
);
const second = requireOk(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    ledger_jsonl: ledger1,
    request_id: "buyvoid_b_bbbbbbbb",
    payment_transaction_hash: "0x" + "b".repeat(64),
    payment_log_index: 8,
    buyer_delivery_wallet: "0x" + "2".repeat(40),
    quote_void_amount: "4",
    quote_usdc_amount: "2",
    verified_payment_receipt_ref: sha("5"),
    payment_verified_event_sha256: sha("6"),
    duplicate_payment_guard_result: sha("7"),
    inventory_allocation_guard_result: sha("8"),
    operator_activation_record_ref: sha("9"),
    created_at_ms: baseInput.created_at_ms + 1000,
  }),
);
const ledger2 = second.next_ledger_jsonl;
const high2 = requireOk(
  deriveBuyVoidAllocationReservationHighWaterV1(ledger2),
);

function classify(
  currentLedger: string,
  currentHighWater: string,
  priorReceipt: unknown | null,
  host: unknown = hostEvidence(),
  writerHead: unknown =
    VOID_BUY_VOID_ALLOCATION_CUSTODY_REVIEWED_WRITER_HEAD_V1,
) {
  return classifyBuyVoidAllocationCustodyQualificationV1({
    writer_source_head: writerHead,
    host_evidence: host,
    current_ledger_jsonl: currentLedger,
    current_high_water_json: currentHighWater,
    prior_receipt: priorReceipt,
  });
}

const genesis = requireOk(
  classify("", emptyHigh.high_water_json, null),
);
assert.equal(genesis.status, "source_qualified");
assert.equal(genesis.receipt.custody_epoch, "0");
assert.equal(genesis.receipt.previous_receipt_sha256, null);
assert.equal(genesis.receipt.record_count, 0);
assert.equal(genesis.receipt.ledger_bytes, 0);
assert.equal(genesis.root_path_stability_evidence_qualified, true);
assert.equal(
  genesis.separate_storage_domain_evidence_qualified,
  true,
);
assert.equal(
  genesis.monotonic_continuity_against_supplied_prior,
  true,
);
assert.equal(genesis.prior_receipt_external_trust_proven, false);
assert.equal(genesis.independent_custody_proven, false);
assert.equal(genesis.production_gate_ready, false);

const shuffledGenesis = requireOk(
  classify(
    "",
    emptyHigh.high_water_json,
    null,
    reverseObjectKeys(hostEvidence()),
  ),
);
assert.equal(
  shuffledGenesis.qualification_id_sha256,
  genesis.qualification_id_sha256,
);
assert.equal(
  shuffledGenesis.receipt.receipt_sha256,
  genesis.receipt.receipt_sha256,
);

const idempotent = requireOk(
  classify(
    "",
    emptyHigh.high_water_json,
    genesis.receipt,
  ),
);
assert.equal(idempotent.status, "idempotent");
assert.equal(
  idempotent.qualification_id_sha256,
  genesis.qualification_id_sha256,
);
assert.deepEqual(idempotent.receipt, genesis.receipt);

const advanced = requireOk(
  classify(
    ledger1,
    high1.high_water_json,
    genesis.receipt,
  ),
);
assert.equal(advanced.status, "source_qualified");
assert.equal(advanced.receipt.custody_epoch, "1");
assert.equal(
  advanced.receipt.previous_receipt_sha256,
  genesis.receipt.receipt_sha256,
);
assert.equal(advanced.receipt.record_count, 1);
assert.equal(advanced.receipt.ledger_bytes, Buffer.byteLength(ledger1));
assert.equal(advanced.receipt.tip_hash, first.record.allocation_record_hash);

const advancedReplay = requireOk(
  classify(
    ledger1,
    high1.high_water_json,
    advanced.receipt,
  ),
);
assert.equal(advancedReplay.status, "idempotent");
assert.deepEqual(advancedReplay.receipt, advanced.receipt);

expectHeld(
  classify(
    ledger1,
    high1.high_water_json,
    null,
  ),
  "custody_prior_receipt_required",
);

expectHeld(
  classify(
    ledger2,
    high2.high_water_json,
    genesis.receipt,
  ),
  "custody_multi_record_jump_forbidden",
);

function rebuildReceipt(
  receipt: BuyVoidAllocationCustodyReceiptV1,
  overrides: Partial<BuyVoidAllocationCustodyReceiptV1>,
): BuyVoidAllocationCustodyReceiptV1 {
  const next = {
    ...receipt,
    ...overrides,
  };
  const highWaterJson =
    JSON.stringify({
      schema:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1,
      marker:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
      version: 1,
      record_count: next.record_count,
      tip_hash: next.tip_hash,
      ledger_sha256: next.ledger_sha256,
      ledger_bytes: next.ledger_bytes,
      pool_void_total: next.pool_void_total,
      reserved_void_total: next.reserved_void_total,
      remaining_void: next.remaining_void,
    }) + "\n";
  next.high_water_sha256 =
    sha256Id(Buffer.from(highWaterJson, "utf8"));
  const body = { ...next };
  delete (body as Partial<BuyVoidAllocationCustodyReceiptV1>)
    .receipt_sha256;
  next.receipt_sha256 = sha256Id(canonicalJson(body));
  return next;
}

const forgedPrefix = rebuildReceipt(
  genesis.receipt,
  {
    ledger_sha256: sha("f"),
  },
);
expectHeld(
  classify(
    ledger1,
    high1.high_water_json,
    forgedPrefix,
  ),
  "custody_prior_ledger_prefix_invalid",
);

const conflictingSameCount = rebuildReceipt(
  advanced.receipt,
  {
    remaining_void: "9999993",
  },
);
expectHeld(
  classify(
    ledger1,
    high1.high_water_json,
    conflictingSameCount,
  ),
  "custody_same_epoch_state_conflict",
);

{
  const host = structuredClone(hostEvidence());
  const custody =
    host.custody_root as Record<string, unknown>;
  const custodyMount =
    custody.mount as Record<string, unknown>;
  const ledger =
    host.ledger_root as Record<string, unknown>;
  const ledgerMount =
    ledger.mount as Record<string, unknown>;
  custodyMount.mount_source = ledgerMount.mount_source;
  expectHeld(
    classify("", emptyHigh.high_water_json, null, host),
    "custody_failure_domain_not_independent",
  );
}

{
  const host = structuredClone(hostEvidence());
  const custody =
    host.custody_root as Record<string, unknown>;
  const custodyMount =
    custody.mount as Record<string, unknown>;
  custodyMount.medium_present = false;
  expectHeld(
    classify("", emptyHigh.high_water_json, null, host),
    "custody_medium_missing",
  );
}

{
  const host = structuredClone(hostEvidence());
  host.runtime_uid = 2001;
  expectHeld(
    classify("", emptyHigh.high_water_json, null, host),
    "custody_runtime_identity_not_separated",
  );
}

{
  const host = structuredClone(hostEvidence());
  const ledger =
    host.ledger_root as Record<string, unknown>;
  ledger.runtime_write = true;
  expectHeld(
    classify("", emptyHigh.high_water_json, null, host),
    "custody_runtime_can_replace_root",
  );
}

{
  const host = structuredClone(hostEvidence());
  const ledger =
    host.ledger_root as Record<string, unknown>;
  const ancestors =
    ledger.ancestors as Record<string, unknown>[];
  ancestors[1].mode = "0777";
  expectHeld(
    classify("", emptyHigh.high_water_json, null, host),
    "custody_ancestor_authority_invalid",
  );
}

{
  const host = structuredClone(hostEvidence());
  const socket = host.socket as Record<string, unknown>;
  socket.arbitrary_path_write = true;
  expectHeld(
    classify("", emptyHigh.high_water_json, null, host),
    "custody_socket_authority_invalid",
  );
}

{
  const host = structuredClone(hostEvidence());
  const service =
    host.service_policy as Record<string, unknown>;
  service.no_new_privileges = false;
  expectHeld(
    classify("", emptyHigh.high_water_json, null, host),
    "custody_service_policy_invalid",
  );
}

{
  const host = structuredClone(hostEvidence());
  host.fallback_storage_enabled = true;
  expectHeld(
    classify("", emptyHigh.high_water_json, null, host),
    "custody_fallback_storage_invalid",
  );
}

expectHeld(
  classify(
    "",
    emptyHigh.high_water_json,
    null,
    hostEvidence(),
    "f".repeat(40),
  ),
  "custody_source_binding_invalid",
);

{
  const changed = structuredClone(hostEvidence());
  changed.host_id = "precision-mainnet0-changed";
  expectHeld(
    classify(
      ledger1,
      high1.high_water_json,
      genesis.receipt,
      changed,
    ),
    "custody_prior_receipt_policy_mismatch",
  );
}

const corruptedReceipt = {
  ...genesis.receipt,
  receipt_sha256: sha("f"),
};
expectHeld(
  classify(
    ledger1,
    high1.high_water_json,
    corruptedReceipt,
  ),
  "custody_prior_receipt_invalid",
);

for (const [key, expected] of Object.entries({
  source_only_contract: true,
  io_performed: false,
  host_evidence_input_only: true,
  exact_reviewed_writer_head_required: true,
  canonical_current_high_water_binding_reused: true,
  canonical_single_append_planner_reused: true,
  exact_prior_ledger_prefix_required: true,
  single_append_continuity_only: true,
  mount_instance_fingerprint_bound: true,
  storage_failure_domain_fingerprint_bound: true,
  bind_alias_independence_forbidden: true,
  root_path_stability_evidence_required: true,
  dedicated_custody_identity_required: true,
  private_unix_socket_policy_required: true,
  hardened_service_policy_required: true,
  no_fallback_storage_required: true,
  prior_receipt_external_trust_proven: false,
  live_host_qualification_performed: false,
  host_mutation: false,
  service_install: false,
  service_start: false,
  mount_mutation: false,
  permission_mutation: false,
  runtime_integration: false,
  payment_acceptance: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_mutation: false,
  market_activation: false,
  public_presale_activation: false,
  independent_custody_proven: false,
  production_gate_ready: false,
  funds_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_AUTHORITY_V1 as
      Record<string, unknown>)[key],
    expected,
    key,
  );
}

assert.equal(
  genesis.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_V1,
);
assert.equal(
  genesis.receipt.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_RECEIPT_V1,
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_V1_PROOF_GREEN",
);
console.log(
  "reviewed_writer_head=" +
    VOID_BUY_VOID_ALLOCATION_CUSTODY_REVIEWED_WRITER_HEAD_V1,
);
console.log("genesis_receipt_required=true");
console.log("key_order_invariant_qualification_id=true");
console.log("exact_one_record_continuity=true");
console.log("multi_record_jump_forbidden=true");
console.log("prior_ledger_prefix_reconstructed=true");
console.log("bind_alias_independence_forbidden=true");
console.log("root_owned_ancestor_chain_required=true");
console.log("dedicated_custody_identity_required=true");
console.log("private_af_unix_boundary_required=true");
console.log("hardened_service_policy_required=true");
console.log("fallback_storage_forbidden=true");
console.log("prior_receipt_external_trust_proven=false");
console.log("live_host_qualification_performed=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
