#!/usr/bin/env node
import path from "node:path";
import { types as utilTypes } from "node:util";

export const VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1 =
  "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1";
export const VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_SCHEMA_V1 =
  "void_economic_sponsored_runtime_storage_topology_policy_v1";

export const VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_DEPENDENCIES_V1 =
  Object.freeze({
    observation_time_store_git_blob_sha1:
      "53f0bae06b3361088712eaf6ef6d17e5d9c676de",
    reservation_store_git_blob_sha1:
      "8804c99ccdcf4fbcd2becb11689ccfa90b0391f8",
    durable_replay_store_git_blob_sha1:
      "2b267e11d087bec0e0a56825dce9f998d5bc3ad5",
    production_replay_binding_artifact_git_blob_sha1:
      "ab7982b52fb0850eb2f1e796c88dcd7a7c743b6c",
  });

export const VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    three_root_custody_policy_required: true,
    distinct_non_root_runtime_identity_required: true,
    protected_system_service_policy_required: true,
    zero_runtime_capabilities_required: true,
    pairwise_disjoint_roots_required: true,
    runtime_owned_private_roots_required: true,
    preprovisioned_store_children_required: true,
    complete_root_ancestor_chain_required: true,
    root_owned_nonwritable_ancestors_required: true,
    runtime_root_replacement_denied_required: true,
    historical_same_uid_home_replay_topology_accepted: false,
    production_service_identity_selected: false,
    production_runtime_uid_gid_selected: false,
    production_root_paths_selected: false,
    live_host_evidence_verified: false,
    time_store_root_stability_proven: false,
    reservation_store_root_stability_proven: false,
    execution_replay_store_root_stability_proven: false,
    time_store_rollback_resistance_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    execution_replay_atomic_consume_performed: false,
    storage_bootstrap: false,
    service_installation: false,
    service_start: false,
    systemd_mutation: false,
    filesystem_mutation: false,
    runtime_integration: false,
    gas_sponsorship_performed: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    public_presale_activation: false,
    work_credit_write: false,
    funds_movement: false,
  });

const MAX_ID = 0x7fff_ffff;
const SERVICE_RE = /^[A-Za-z0-9_.@-]{1,120}\.service$/u;
const MODE_RE = /^0[0-7]{3}$/u;

const ROOT_KEYS = Object.freeze([
  "role",
  "root_path",
  "owner_uid",
  "owner_gid",
  "mode",
  "real_directory",
  "symlink",
  "preprovisioned",
  "runtime_write_required",
  "runtime_can_replace_root",
  "children",
  "ancestors",
]);
const CHILD_KEYS = Object.freeze([
  "name",
  "owner_uid",
  "owner_gid",
  "mode",
  "real_directory",
  "symlink",
  "preprovisioned",
]);
const ANCESTOR_KEYS = Object.freeze([
  "path",
  "owner_uid",
  "owner_gid",
  "mode",
  "real_directory",
  "symlink",
  "runtime_write",
  "runtime_rename",
  "runtime_recreate",
]);
const RUNTIME_KEYS = Object.freeze([
  "service_unit",
  "manager_scope",
  "uid",
  "gid",
  "service_definition_root_owned",
  "service_definition_group_other_writable",
  "runtime_can_control_service",
  "no_new_privileges",
  "effective_capabilities_empty",
  "ambient_capabilities_empty",
  "bounding_capabilities_empty",
]);
const ROOT_CHILDREN = Object.freeze({
  time: Object.freeze(["observation-time-v1.queue", "records"]),
  reservation: Object.freeze(["records", "sponsorship-admission-v1.queue"]),
  replay: Object.freeze([]),
});

function fail(reason) {
  throw new Error(reason);
}
function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function exactSnapshot(value, keys, reason) {
  if (
    value === null ||
    typeof value !== "object" ||
    utilTypes.isProxy(value) ||
    Array.isArray(value)
  ) {
    fail(reason);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(reason);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) fail(reason);
  const actual = own.slice().sort(compareText);
  const wanted = [...keys].sort(compareText);
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(reason);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(reason);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}
function safeId(value, reason, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum || value > MAX_ID) {
    fail(reason);
  }
  return value;
}
function exactBoolean(value, expected, reason) {
  if (value !== expected) fail(reason);
}
function mode(value, reason) {
  if (typeof value !== "string" || !MODE_RE.test(value)) fail(reason);
  return Number.parseInt(value, 8);
}
function canonicalAbsolute(value, reason) {
  if (
    typeof value !== "string" ||
    !path.isAbsolute(value) ||
    path.resolve(value) !== value ||
    value.includes("\0")
  ) {
    fail(reason);
  }
  return value;
}
function normalizeRuntime(value) {
  const runtime = exactSnapshot(
    value,
    RUNTIME_KEYS,
    "sponsored_runtime_storage_topology_runtime_invalid",
  );
  if (
    typeof runtime.service_unit !== "string" ||
    !SERVICE_RE.test(runtime.service_unit) ||
    runtime.manager_scope !== "system"
  ) {
    fail("sponsored_runtime_storage_topology_runtime_service_invalid");
  }
  const uid = safeId(
    runtime.uid,
    "sponsored_runtime_storage_topology_runtime_uid_invalid",
    1,
  );
  const gid = safeId(
    runtime.gid,
    "sponsored_runtime_storage_topology_runtime_gid_invalid",
    1,
  );
  exactBoolean(
    runtime.service_definition_root_owned,
    true,
    "sponsored_runtime_storage_topology_runtime_service_custody_invalid",
  );
  exactBoolean(
    runtime.service_definition_group_other_writable,
    false,
    "sponsored_runtime_storage_topology_runtime_service_custody_invalid",
  );
  exactBoolean(
    runtime.runtime_can_control_service,
    false,
    "sponsored_runtime_storage_topology_runtime_service_control_invalid",
  );
  exactBoolean(
    runtime.no_new_privileges,
    true,
    "sponsored_runtime_storage_topology_runtime_nnp_required",
  );
  for (const key of [
    "effective_capabilities_empty",
    "ambient_capabilities_empty",
    "bounding_capabilities_empty",
  ]) {
    exactBoolean(
      runtime[key],
      true,
      "sponsored_runtime_storage_topology_runtime_capabilities_invalid",
    );
  }
  return Object.freeze({ runtime, uid, gid });
}
function expectedAncestorPaths(rootPath) {
  const out = [];
  let cursor = path.dirname(rootPath);
  while (true) {
    out.push(cursor);
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return out;
}
function normalizeAncestors(value, rootPath, runtimeUid) {
  if (!Array.isArray(value)) {
    fail("sponsored_runtime_storage_topology_ancestors_invalid");
  }
  const expected = expectedAncestorPaths(rootPath);
  if (value.length !== expected.length) {
    fail("sponsored_runtime_storage_topology_ancestor_chain_incomplete");
  }
  return Object.freeze(
    value.map((raw, index) => {
      const ancestor = exactSnapshot(
        raw,
        ANCESTOR_KEYS,
        "sponsored_runtime_storage_topology_ancestor_invalid",
      );
      const ancestorPath = canonicalAbsolute(
        ancestor.path,
        "sponsored_runtime_storage_topology_ancestor_path_invalid",
      );
      if (ancestorPath !== expected[index]) {
        fail("sponsored_runtime_storage_topology_ancestor_chain_incomplete");
      }
      if (
        safeId(
          ancestor.owner_uid,
          "sponsored_runtime_storage_topology_ancestor_owner_invalid",
        ) !== 0 ||
        safeId(
          ancestor.owner_gid,
          "sponsored_runtime_storage_topology_ancestor_owner_invalid",
        ) !== 0 ||
        ancestor.owner_uid === runtimeUid
      ) {
        fail("sponsored_runtime_storage_topology_ancestor_owner_invalid");
      }
      const bits = mode(
        ancestor.mode,
        "sponsored_runtime_storage_topology_ancestor_mode_invalid",
      );
      if ((bits & 0o022) !== 0) {
        fail("sponsored_runtime_storage_topology_ancestor_writable");
      }
      exactBoolean(
        ancestor.real_directory,
        true,
        "sponsored_runtime_storage_topology_ancestor_type_invalid",
      );
      exactBoolean(
        ancestor.symlink,
        false,
        "sponsored_runtime_storage_topology_ancestor_type_invalid",
      );
      for (const key of [
        "runtime_write",
        "runtime_rename",
        "runtime_recreate",
      ]) {
        exactBoolean(
          ancestor[key],
          false,
          "sponsored_runtime_storage_topology_ancestor_runtime_authority_invalid",
        );
      }
      return ancestor;
    }),
  );
}
function normalizeChildren(value, role, runtimeUid, runtimeGid) {
  if (!Array.isArray(value)) {
    fail("sponsored_runtime_storage_topology_children_invalid");
  }
  const expected = [...ROOT_CHILDREN[role]];
  if (value.length !== expected.length) {
    fail("sponsored_runtime_storage_topology_children_invalid");
  }
  const rows = value.map((raw) => {
    const child = exactSnapshot(
      raw,
      CHILD_KEYS,
      "sponsored_runtime_storage_topology_child_invalid",
    );
    if (
      typeof child.name !== "string" ||
      child.name.includes("/") ||
      child.name === "." ||
      child.name === ".."
    ) {
      fail("sponsored_runtime_storage_topology_child_name_invalid");
    }
    if (
      safeId(
        child.owner_uid,
        "sponsored_runtime_storage_topology_child_owner_invalid",
      ) !== runtimeUid ||
      safeId(
        child.owner_gid,
        "sponsored_runtime_storage_topology_child_owner_invalid",
      ) !== runtimeGid ||
      child.mode !== "0700"
    ) {
      fail("sponsored_runtime_storage_topology_child_owner_mode_invalid");
    }
    exactBoolean(
      child.real_directory,
      true,
      "sponsored_runtime_storage_topology_child_type_invalid",
    );
    exactBoolean(
      child.symlink,
      false,
      "sponsored_runtime_storage_topology_child_type_invalid",
    );
    exactBoolean(
      child.preprovisioned,
      true,
      "sponsored_runtime_storage_topology_child_preprovision_invalid",
    );
    return child;
  });
  const actualNames = rows.map((row) => row.name).sort(compareText);
  if (actualNames.some((name, index) => name !== expected[index])) {
    fail("sponsored_runtime_storage_topology_children_invalid");
  }
  return Object.freeze(rows);
}
function normalizeRoot(value, role, runtimeUid, runtimeGid) {
  const root = exactSnapshot(
    value,
    ROOT_KEYS,
    "sponsored_runtime_storage_topology_root_invalid",
  );
  if (root.role !== role) {
    fail("sponsored_runtime_storage_topology_root_role_invalid");
  }
  const rootPath = canonicalAbsolute(
    root.root_path,
    "sponsored_runtime_storage_topology_root_path_invalid",
  );
  if (rootPath === path.parse(rootPath).root) {
    fail("sponsored_runtime_storage_topology_root_path_invalid");
  }
  if (
    safeId(
      root.owner_uid,
      "sponsored_runtime_storage_topology_root_owner_invalid",
    ) !== runtimeUid ||
    safeId(
      root.owner_gid,
      "sponsored_runtime_storage_topology_root_owner_invalid",
    ) !== runtimeGid ||
    root.mode !== "0700"
  ) {
    fail("sponsored_runtime_storage_topology_root_owner_mode_invalid");
  }
  exactBoolean(
    root.real_directory,
    true,
    "sponsored_runtime_storage_topology_root_type_invalid",
  );
  exactBoolean(
    root.symlink,
    false,
    "sponsored_runtime_storage_topology_root_type_invalid",
  );
  exactBoolean(
    root.preprovisioned,
    true,
    "sponsored_runtime_storage_topology_root_preprovision_invalid",
  );
  exactBoolean(
    root.runtime_write_required,
    true,
    "sponsored_runtime_storage_topology_root_write_invalid",
  );
  exactBoolean(
    root.runtime_can_replace_root,
    false,
    "sponsored_runtime_storage_topology_root_replace_invalid",
  );
  const children = normalizeChildren(
    root.children,
    role,
    runtimeUid,
    runtimeGid,
  );
  const ancestors = normalizeAncestors(
    root.ancestors,
    rootPath,
    runtimeUid,
  );
  return Object.freeze({ root, rootPath, children, ancestors });
}
function rootsDisjoint(roots) {
  for (let left = 0; left < roots.length; left += 1) {
    for (let right = left + 1; right < roots.length; right += 1) {
      const a = roots[left];
      const b = roots[right];
      if (a === b) return false;
      const ab = path.relative(a, b);
      const ba = path.relative(b, a);
      if (
        (ab && !ab.startsWith("..") && !path.isAbsolute(ab)) ||
        (ba && !ba.startsWith("..") && !path.isAbsolute(ba))
      ) {
        return false;
      }
    }
  }
  return true;
}
function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1,
    version: 1,
    reason,
    policy_shape_qualified: false,
    historical_same_uid_home_replay_topology_accepted: false,
    production_service_identity_selected: false,
    production_runtime_uid_gid_selected: false,
    production_root_paths_selected: false,
    live_host_evidence_verified: false,
    time_store_root_stability_proven: false,
    reservation_store_root_stability_proven: false,
    execution_replay_store_root_stability_proven: false,
    time_store_rollback_resistance_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    execution_replay_atomic_consume_performed: false,
    storage_bootstrap: false,
    runtime_integration: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_AUTHORITY_V1,
  });
}

export function classifyVoidEconomicSponsoredRuntimeStorageTopologyPolicyV1(
  input,
) {
  try {
    const request = exactSnapshot(
      input,
      [
        "schema",
        "marker",
        "version",
        "runtime",
        "time_store",
        "reservation_store",
        "replay_store",
      ],
      "sponsored_runtime_storage_topology_input_invalid",
    );
    if (
      request.schema !==
        VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_SCHEMA_V1 ||
      request.marker !==
        VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1 ||
      request.version !== 1
    ) {
      fail("sponsored_runtime_storage_topology_identity_invalid");
    }
    const runtime = normalizeRuntime(request.runtime);
    const time = normalizeRoot(
      request.time_store,
      "time",
      runtime.uid,
      runtime.gid,
    );
    const reservation = normalizeRoot(
      request.reservation_store,
      "reservation",
      runtime.uid,
      runtime.gid,
    );
    const replay = normalizeRoot(
      request.replay_store,
      "replay",
      runtime.uid,
      runtime.gid,
    );
    const rootPaths = [
      time.rootPath,
      reservation.rootPath,
      replay.rootPath,
    ];
    if (!rootsDisjoint(rootPaths)) {
      fail("sponsored_runtime_storage_topology_roots_not_disjoint");
    }

    return Object.freeze({
      ok: true,
      status: "POLICY_SHAPE_QUALIFIED_NOT_LIVE",
      marker: VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1,
      version: 1,
      runtime_service_policy_shape_qualified: true,
      zero_runtime_capabilities_policy_shape_qualified: true,
      time_store_topology_policy_shape_qualified: true,
      reservation_store_topology_policy_shape_qualified: true,
      execution_replay_store_topology_policy_shape_qualified: true,
      pairwise_disjoint_roots_qualified: true,
      preprovisioned_store_children_policy_shape_qualified: true,
      root_owned_ancestor_policy_shape_qualified: true,
      runtime_root_replacement_denied_policy_shape_qualified: true,
      historical_same_uid_home_replay_topology_accepted: false,
      production_service_identity_selected: false,
      production_runtime_uid_gid_selected: false,
      production_root_paths_selected: false,
      live_host_evidence_verified: false,
      time_store_root_stability_proven: false,
      reservation_store_root_stability_proven: false,
      execution_replay_store_root_stability_proven: false,
      time_store_rollback_resistance_proven: false,
      cross_process_restart_continuity_proven: false,
      cross_boot_restart_continuity_proven: false,
      execution_replay_atomic_consume_performed: false,
      storage_bootstrap: false,
      service_installation: false,
      service_start: false,
      systemd_mutation: false,
      filesystem_mutation: false,
      runtime_integration: false,
      gas_sponsorship_performed: false,
      transaction_submission: false,
      public_presale_activation: false,
      work_credit_write: false,
      funds_movement: false,
      reviewed_dependencies:
        VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_DEPENDENCIES_V1,
      authority:
        VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}
