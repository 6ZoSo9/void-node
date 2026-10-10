#!/usr/bin/env node
import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1 =
  "VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1";

export const VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_AUTHORITY_V1 =
  Object.freeze({
    source_only_plan: true,
    operator_transcript_is_untrusted_observation: true,
    host_read_performed: false,
    host_write_performed: false,
    service_file_generated: false,
    service_installed: false,
    service_started: false,
    polkit_rule_installed: false,
    socket_created: false,
    mount_or_permissions_mutated: false,
    runtime_updated_or_restarted: false,
    executable_closure_proven: false,
    independent_custody_proven: false,
    runtime_integration: false,
    transaction_construction: false,
    transaction_submission: false,
    transaction_signing: false,
    transaction_broadcast: false,
    payment_acceptance: false,
    market_or_presale_activation: false,
    presale_activation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    credential_access: false,
    chain2050_write: false,
    work_credit_write: false,
    inventory_funding: false,
    treasury_movement: false,
    liquidity_movement: false,
    systemd_daemon_reload: false,
    systemd_enablement: false,
    data_root_mutation: false,
    funds_movement: false,
    production_gate_ready: false,
  });

const SHA1 = /^[0-9a-f]{40}$/u;
const SNAPSHOT_KEYS = Object.freeze([
  "schema",
  "observation_label",
  "local_source_head",
  "remote_tracking_head",
  "separate_mount_domains_observed",
  "public_runtime_direct_storage_write_denied_observed",
  "public_runtime_no_new_privileges_proven",
  "public_runtime_bounding_set_empty_proven",
  "dedicated_system_service_installed_proven",
  "dedicated_service_policy_qualified",
  "service_executable_closure_reviewed_and_protected",
  "service_exec_start_exactly_bound",
  "restricted_ipc_socket_qualified",
  "socket_parent_namespace_write_exception_proven",
  "runtime_service_control_denial_proven",
  "code_and_contract_current_source_bound",
  "independent_monotonic_custody_anchor_proven",
  "same_uid_joint_rollback_excluded",
]);

// This is an operator-observed point-in-time sample, NOT signed evidence,
// and never a durable launch authority, even when its assertions are true.
export const VOID_BUY_ALLOCATION_CUSTODY_OCT7_OPERATOR_OBSERVATION_V1 =
  Object.freeze({
    schema: "void.buy.allocation.custody.bootstrap.observation.v1",
    observation_label: "2026-10-07-precision-operator-terminal",
    local_source_head: "e1521fc72730ecb036b71e476a7530656ebfecae",
    remote_tracking_head: "a5409d8b4c418efc7c6d32ff105202af0933f1b5",
    separate_mount_domains_observed: true,
    public_runtime_direct_storage_write_denied_observed: true,
    public_runtime_no_new_privileges_proven: false,
    public_runtime_bounding_set_empty_proven: false,
    dedicated_system_service_installed_proven: false,
    dedicated_service_policy_qualified: false,
    service_executable_closure_reviewed_and_protected: false,
    service_exec_start_exactly_bound: false,
    restricted_ipc_socket_qualified: false,
    socket_parent_namespace_write_exception_proven: false,
    runtime_service_control_denial_proven: false,
    code_and_contract_current_source_bound: false,
    independent_monotonic_custody_anchor_proven: false,
    same_uid_joint_rollback_excluded: false,
  });

const REQUIREMENTS = Object.freeze([
  ["public_runtime_no_new_privileges_proven", "HOLD_PUBLIC_RUNTIME_NO_NEW_PRIVILEGES"],
  ["public_runtime_bounding_set_empty_proven", "HOLD_PUBLIC_RUNTIME_CAPABILITY_BOUNDING_SET"],
  ["service_executable_closure_reviewed_and_protected", "HOLD_ROOT_OWNED_EXECUTABLE_IMPORT_CLOSURE"],
  ["code_and_contract_current_source_bound", "HOLD_CURRENT_REVIEWED_SOURCE_AND_CONTRACT"],
  ["dedicated_system_service_installed_proven", "HOLD_DEDICATED_SYSTEM_SERVICE_INSTALL"],
  ["service_exec_start_exactly_bound", "HOLD_EXACT_EXEC_START"],
  ["dedicated_service_policy_qualified", "HOLD_DEDICATED_SERVICE_HARDENING"],
  ["restricted_ipc_socket_qualified", "HOLD_PRIVATE_AF_UNIX_SOCKET"],
  ["socket_parent_namespace_write_exception_proven", "HOLD_SOCKET_PARENT_WRITABLE_NAMESPACE_EXCEPTION"],
  ["runtime_service_control_denial_proven", "HOLD_RUNTIME_SYSTEMD_POLKIT_CONTROL_DENIAL"],
  ["independent_monotonic_custody_anchor_proven", "HOLD_INDEPENDENT_MONOTONIC_CUSTODY_ANCHOR"],
  ["same_uid_joint_rollback_excluded", "HOLD_SAME_UID_JOINT_ROLLBACK"],
]);

const PRE_INSPECTION_CANDIDATE = Object.freeze({
  candidate_only: true,
  installable_unit_generated: false,
  systemd_manager: "system",
  public_node_systemd_manager: "user",
  unit_name_candidate: "void-buy-allocation-custody-v1.service",
  socket_unit_needed: false,
  socket_binder: "custody-service-net.createServer",
  socket_activation_implemented: false,
  socket_transport: "AF_UNIX",
  socket_mode_target: "0660",
  socket_parent_mode_target: "0750",
  socket_parent_owner: "void-buy-custody",
  socket_parent_group: "distinct-review-required-ipc-group",
  socket_parent_write_namespace_exception_required: true,
  socket_parent_writable_inside_service_namespace_proven: false,
  socket_parent_namespace_exception_mechanism_selected: false,
  socket_parent_namespace_exception_mechanism: null,
  runtime_user_observed: "zoso",
  custody_user_observed: "void-buy-custody",
  ledger_root: "/var/lib/void-allocation-ledger-v1",
  high_water_root: "/var/lib/void-allocation-custody-v1",
  requested_exec_start: null,
  reviewed_root_owned_code_closure_selected: false,
  service_source: "tools/void-buy-allocation-custody-service-v1.mjs",
  service_source_sha256:
    "sha256:cccc37795507bb5ccf659f28374bafae27f93e56ef3ecbf2f72fd79b05e6185d",
  service_contract: "docs/architecture/buy-void-allocation-custody-service-contract-v1.json",
  service_contract_sha256:
    "sha256:461c97c7f65cce4a96cab7977222fcf9edb4cdd2d89b231709d13a9d1b7f3477",
  top_level_source_imports: Object.freeze([
    "../dist/economic/buy_void_allocation_reservation_ledger_v1.js",
    "../dist/economic/buy_void_allocation_reservation_high_water_v1.js",
  ]),
  reviewed_compiled_transitive_closure_proven: false,
  service_policy_target: Object.freeze({
    User: "void-buy-custody",
    Group: "void-buy-custody",
    UMask: "0077",
    NoNewPrivileges: true,
    PrivateTmp: true,
    PrivateDevices: true,
    ProtectSystem: "strict",
    ProtectHome: true,
    ProtectKernelTunables: true,
    ProtectKernelModules: true,
    ProtectControlGroups: true,
    LockPersonality: true,
    RestrictSUIDSGID: true,
    RestrictRealtime: true,
    CapabilityBoundingSet: Object.freeze([]),
    AmbientCapabilities: Object.freeze([]),
    RestrictAddressFamilies: Object.freeze(["AF_UNIX"]),
    ReadWritePaths: Object.freeze([
      "/var/lib/void-allocation-custody-v1",
      "/var/lib/void-allocation-ledger-v1",
    ]),
  }),
  runtime_policy_target: Object.freeze({
    NoNewPrivileges: true,
    CapabilityBoundingSet: Object.freeze([]),
    AmbientCapabilities: Object.freeze([]),
    direct_custody_root_writes: false,
    custody_unit_management: false,
  }),
  polkit_deny_path: "/etc/polkit-1/rules.d/00-void-buy-allocation-custody-runtime-deny-v1.rules",
  polkit_denial_requires_live_explicit_status_one_checks: true,
  storage_root_owner_uid_observed: 994,
  storage_root_owner_gid_observed: 981,
  independent_custody_proven: false,
  production_gate_ready: false,
});

// This is a new diagnostic candidate, not a reissue of the old source tuple.
// Preserve the full earlier candidate and the Oct 7 observation independently.
const CANDIDATE = Object.freeze({
  ...PRE_INSPECTION_CANDIDATE,
  source_review_generation: "descriptor-inspection-20261010",
  source_review_ref: "c7e5993bb5fd4d8fb402762a56925a9ce9e25518",
  predecessor_candidate: PRE_INSPECTION_CANDIDATE,
  service_source_sha256:
    "sha256:fbb625afda82eb3ed3870ac8f181c2ef6b1c3d30b5b93b9c5961dbe4278bfd88",
  service_contract_sha256:
    "sha256:676cea042a50afa52bbdcf3f397209f2ff6d9b7c2dc175a2c4d8b5821fac67d5",
  top_level_source_imports: Object.freeze([
    ...PRE_INSPECTION_CANDIDATE.top_level_source_imports,
    "../src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs",
  ]),
  inspection_dependency: Object.freeze({
    source: "src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs",
    source_git_blob: "1bf88a403b1012ac00edaf634c5ed237a898043c",
    source_sha256:
      "sha256:a2a550f766659235a3e21a6d16003b22f482872e73f31ae23f8dbaf01dbe3979",
    static_imports: Object.freeze([
      "node:crypto", "node:fs", "node:path", "node:util",
    ]),
  }),
  inspection_runtime_requirements: Object.freeze({
    platform: "linux",
    nonroot_uid: true,
    proc_self_fd: true,
    canonical_simple_component_paths: true,
    separate_nonnested_roots: true,
    root_permission_bits: "0700",
    file_permission_bits: "0600",
    files_single_link: true,
    read_window_only: true,
    host_qualified: false,
    cross_root_atomic_snapshot_proven: false,
  }),
});

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  throw new Error("custody_bootstrap_plan_noncanonical_value");
}

function exactObservation(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
      utilTypes.isProxy(raw) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(raw))) {
    throw new Error("custody_bootstrap_plan_observation_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(k => typeof k !== "string") ||
      keys.length !== SNAPSHOT_KEYS.length ||
      keys.slice().sort().some((k, i) => k !== [...SNAPSHOT_KEYS].sort()[i])) {
    throw new Error("custody_bootstrap_plan_observation_shape_invalid");
  }
  const out = Object.create(null);
  for (const key of SNAPSHOT_KEYS) {
    const d = descriptors[key];
    if (!d || !d.enumerable || !Object.hasOwn(d, "value")) {
      throw new Error("custody_bootstrap_plan_observation_accessor_rejected");
    }
    out[key] = d.value;
  }
  if (out.schema !== "void.buy.allocation.custody.bootstrap.observation.v1" ||
      typeof out.observation_label !== "string" ||
      !/^[A-Za-z0-9._-]{1,100}$/u.test(out.observation_label) ||
      !SHA1.test(out.local_source_head) || !SHA1.test(out.remote_tracking_head) ||
      SNAPSHOT_KEYS.slice(4).some(k => typeof out[k] !== "boolean")) {
    throw new Error("custody_bootstrap_plan_observation_fields_invalid");
  }
  return Object.freeze(out);
}

export function classifyBuyAllocationCustodyServiceBootstrapPlanV1(raw) {
  const observed = exactObservation(raw);
  const holds = REQUIREMENTS.filter(([key]) => observed[key] !== true)
    .map(([, reason]) => reason);
  if (!observed.separate_mount_domains_observed) {
    holds.push("HOLD_SEPARATE_STORAGE_DOMAINS_NOT_OBSERVED");
  }
  if (!observed.public_runtime_direct_storage_write_denied_observed) {
    holds.push("HOLD_PUBLIC_RUNTIME_DIRECT_WRITE_NOT_DENIED");
  }
  // A completely fabricated/all-true caller observation still has NO
  // production authority. Only independently qualified live host evidence,
  // separately protected monotonic receipts and later operator gates can grant it.
  const body = Object.freeze({
    schema: "void.buy.allocation.custody.bootstrap.plan.v1",
    marker: VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1,
    version: 1,
    status: "HOLD_SOURCE_ONLY",
    observation_label: observed.observation_label,
    observation_trusted_as_authority: false,
    source_head_verified_against_remote: false,
    plan_digest_scope: "canonical_plan_body_only",
    plan_digest_authenticated: false,
    plan_digest_signed: false,
    plan_digest_is_attestation: false,
    plan_digest_source_provenance_verified: false,
    plan_digest_designated_host_bound: false,
    plan_digest_operator_identity_bound: false,
    plan_digest_freshness_bound: false,
    observed_local_source_head: observed.local_source_head,
    observed_remote_tracking_head: observed.remote_tracking_head,
    reported_missing_requirements: Object.freeze(holds),
    candidate: CANDIDATE,
    executable_unit_emitted: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    authority: VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_AUTHORITY_V1,
  });
  return Object.freeze({
    ...body,
    plan_sha256: "sha256:" + createHash("sha256")
      .update(canonicalJson(body), "utf8").digest("hex"),
  });
}

function main() {
  const mode = process.argv[2] ?? "--plan";
  if (mode === "--help" && process.argv.length === 3) {
    process.stdout.write("VOID Buy allocation custody bootstrap candidate v1; --plan only, no --apply.\n");
    return;
  }
  if (mode !== "--plan" || process.argv.length > 3) {
    process.stderr.write("HOLD: invalid mode; no install, no --apply, no mutation.\n");
    process.exitCode = 2;
    return;
  }
  const plan = classifyBuyAllocationCustodyServiceBootstrapPlanV1(
    VOID_BUY_ALLOCATION_CUSTODY_OCT7_OPERATOR_OBSERVATION_V1,
  );
  process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
}

if (process.argv[1] &&
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
