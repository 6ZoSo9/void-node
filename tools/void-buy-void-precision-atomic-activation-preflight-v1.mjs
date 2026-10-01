#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1 =
  "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1";

export const VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_AUTHORITY_V1 =
  Object.freeze({
    designated_host_read_only_preflight: true,
    repository_identity_read: true,
    canonical_repository_origin_required: true,
    reviewed_source_slice_required: true,
    process_environment_read_safe_keys_only: true,
    systemd_dropin_gate_assignment_read: true,
    loopback_status_read: true,
    postgres_qualification_receipt_read: true,
    activation_generation_derivation: true,
    exact_dropin_bytes_derivation: true,
    source_mutation: false,
    dropin_write: false,
    dropin_remove: false,
    daemon_reload: false,
    service_stop: false,
    service_start: false,
    service_restart: false,
    runtime_gate_mutation: false,
    credential_read: false,
    database_connection: false,
    database_mutation: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

export const VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_REVIEWED_MAIN_ANCHOR_V1 =
  "74b5242dde224282de5b1b881d7d4cb942f00d48";

export const VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1 =
  "96-buy-void-payment-keyed-postgres-atomic-activation-v1.conf";

export const VOID_BUY_VOID_PRECISION_ACTIVATION_GATE_ENVS_V1 = Object.freeze({
  parent_runtime: "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
  claimed_runtime:
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
  full_runtime: "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
  admitted_guarded_runtime:
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
  full_runtime_apply:
    "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
});

const EXPECTED_GATE_SOURCES = Object.freeze({
  "70-buy-void-runtime-integration-v1.conf": Object.freeze({
    sha256:
      "4b9221fcce60c29b22cbc2c61899f551086dea50b1d12c32d3f3e6505324aca5",
    assignments: Object.freeze({
      VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED: "1",
    }),
  }),
  "91-buy-void-payment-keyed-production-dormant-v1.conf": Object.freeze({
    sha256:
      "d244e9e6a8e2fc14179861676fa7843a7be6cc5e05b3481afd7bf72eb6ef3e9c",
    assignments: Object.freeze({
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED: "0",
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED: "0",
    }),
  }),
  "94-buy-void-claimed-postgres-precision-reconcile-v1.conf": Object.freeze({
    sha256:
      "2445f07932a367b28c0db7a9743f8467d49c08c18d6ceaf5038bb5aae626a325",
    assignments: Object.freeze({
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED:
        "0",
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED:
        "0",
    }),
  }),
});

const EXPECTED_GATE_WINNERS = Object.freeze({
  VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED:
    "70-buy-void-runtime-integration-v1.conf",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED:
    "94-buy-void-claimed-postgres-precision-reconcile-v1.conf",
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED:
    "91-buy-void-payment-keyed-production-dormant-v1.conf",
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED:
    "94-buy-void-claimed-postgres-precision-reconcile-v1.conf",
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED:
    "91-buy-void-payment-keyed-production-dormant-v1.conf",
});

const EXPECTED_RUNTIME_STATUS = Object.freeze({
  full_runtime_policy_fingerprint_sha256:
    "b56c0abde0ea767711053a15975863ee012758c07907e729ca016f2a3190bd92",
  runtime_policy_fingerprint_sha256:
    "ba23302c2af292e78c07692d58d8bb03090ad695943cdbb15d6b9af394aa7c88",
  preparation_policy_fingerprint_sha256:
    "3f4361d0ac5dac407e4ab1ae3f47b86e497f5af3db481a586c2c3f92b8f85da5",
  receipt_policy_fingerprint_sha256:
    "23fac2c2de846eb99bc3647bfe54a83f704a5bc95a336eb1cc6edf54664390e4",
  history_carrier_authority_id:
    "d4c9e22f0d619e7377ec0388bb8cdc19ef8d3782138ec87c3fe5ef271040af81",
  history_carrier_generation: 1,
});

const EXPECTED_POSTGRES_QUALIFICATION = Object.freeze({
  configuration_fingerprint_sha256:
    "8482aae40f7328749a168a2d64eef4afb67fee218b89425ea5c79d8cbbb52d40",
  schema_fingerprint_sha256:
    "89616f198b0c0a47eef264701ebfce23d3aae3f98474cf050584ea9e899d66f1",
});

const GATE_KEYS = Object.freeze([
  "parent_runtime",
  "claimed_runtime",
  "full_runtime",
  "admitted_guarded_runtime",
  "full_runtime_apply",
]);

const DORMANT_STATE = Object.freeze({
  parent_runtime: "1",
  claimed_runtime: "0",
  full_runtime: "0",
  admitted_guarded_runtime: "0",
  full_runtime_apply: "0",
});

const LIVE_STATE = Object.freeze({
  parent_runtime: "1",
  claimed_runtime: "1",
  full_runtime: "1",
  admitted_guarded_runtime: "1",
  full_runtime_apply: "1",
});

function fail(reason) {
  throw new Error(reason);
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(value, expected, label) {
  if (!plain(value)) fail(label + "_not_object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(label + "_keys_mismatch");
  }
  return value;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sameObject(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameRecordValues(left, right) {
  if (!plain(left) || !plain(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        left[key] === right[key],
    )
  );
}

function normalizeGateState(value, label) {
  const record = exactKeys(value, GATE_KEYS, label);
  const out = {};
  for (const key of GATE_KEYS) {
    const v = record[key];
    if (v !== "0" && v !== "1") {
      fail(label + "_value_invalid:" + key);
    }
    out[key] = v;
  }
  return Object.freeze(out);
}

function normalizeAssignments(value, label) {
  if (!plain(value)) fail(label + "_assignments_invalid");
  const out = {};
  for (const [name, gateValue] of Object.entries(value)) {
    if (!Object.values(VOID_BUY_VOID_PRECISION_ACTIVATION_GATE_ENVS_V1).includes(name)) {
      fail(label + "_unexpected_gate:" + name);
    }
    if (gateValue !== "0" && gateValue !== "1") {
      fail(label + "_gate_value_invalid:" + name);
    }
    out[name] = gateValue;
  }
  return Object.freeze(out);
}

export function evaluateGateSourceInventoryV1(entries) {
  if (!Array.isArray(entries)) fail("gate_sources_not_array");
  const winners = new Map();
  const unreviewed = [];
  const reviewed = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = exactKeys(
      entries[index],
      ["path", "sha256", "assignments"],
      "gate_source",
    );
    if (
      typeof entry.path !== "string" ||
      !path.isAbsolute(entry.path) ||
      path.resolve(entry.path) !== entry.path ||
      typeof entry.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(entry.sha256)
    ) {
      fail("gate_source_identity_invalid");
    }
    const basename = path.basename(entry.path);
    const assignments = normalizeAssignments(
      entry.assignments,
      "gate_source:" + basename,
    );
    if (Object.keys(assignments).length === 0) continue;

    const expected = EXPECTED_GATE_SOURCES[basename];
    if (
      !expected ||
      entry.sha256 !== expected.sha256 ||
      !sameRecordValues(assignments, expected.assignments)
    ) {
      unreviewed.push(
        Object.freeze({
          path: entry.path,
          basename,
          sha256: entry.sha256,
          assignments,
          order: index,
        }),
      );
    } else {
      reviewed.push(
        Object.freeze({
          path: entry.path,
          basename,
          sha256: entry.sha256,
          assignments,
          order: index,
        }),
      );
    }

    for (const [name, gateValue] of Object.entries(assignments)) {
      winners.set(
        name,
        Object.freeze({
          path: entry.path,
          basename,
          sha256: entry.sha256,
          value: gateValue,
          order: index,
        }),
      );
    }
  }

  const winnerObject = Object.freeze(
    Object.fromEntries(winners.entries()),
  );
  const reviewedBasenames = reviewed.map((entry) => entry.basename).sort();
  const expectedBasenames = Object.keys(EXPECTED_GATE_SOURCES).sort();
  const complete =
    reviewedBasenames.length === expectedBasenames.length &&
    reviewedBasenames.every(
      (basename, index) => basename === expectedBasenames[index],
    ) &&
    Object.entries(EXPECTED_GATE_WINNERS).every(
      ([name, basename]) =>
        winnerObject[name]?.basename === basename &&
        winnerObject[name]?.value ===
          EXPECTED_GATE_SOURCES[basename].assignments[name],
    );

  return Object.freeze({
    reviewed: Object.freeze(reviewed),
    unreviewed: Object.freeze(unreviewed),
    winners: winnerObject,
    complete,
  });
}

function renderAtomicDropinV1({
  generation,
  state,
  purpose,
}) {
  if (!plain(generation)) fail("atomic_generation_invalid");
  if (
    typeof generation.generation_id !== "string" ||
    !/^voidbvpcg1_[0-9a-f]{64}$/u.test(generation.generation_id) ||
    typeof generation.configuration_sha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(generation.configuration_sha256)
  ) {
    fail("atomic_generation_identity_invalid");
  }
  const normalized = normalizeGateState(state, "render_state");
  const lines = [
    "# VOID Buy VOID payment-keyed PostgreSQL atomic activation overlay v1",
    "# source-only preflight output; installation is separately authorized",
    "# purpose=" + purpose,
    "# generation_id=" + generation.generation_id,
    "# configuration_sha256=" + generation.configuration_sha256,
    "[Service]",
  ];
  for (const key of GATE_KEYS) {
    lines.push(
      "Environment=" +
        VOID_BUY_VOID_PRECISION_ACTIVATION_GATE_ENVS_V1[key] +
        "=" +
        normalized[key],
    );
  }
  lines.push("");
  const text = lines.join("\n");
  return Object.freeze({
    basename:
      VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1,
    bytes: text,
    sha256: sha256(Buffer.from(text, "utf8")),
  });
}

export function renderVoidBuyVoidPrecisionAtomicActivationDropinV1({
  generation_id,
  configuration_sha256,
  mode,
}) {
  if (mode !== "live_apply" && mode !== "dormant_rollback") {
    fail("atomic_render_mode_invalid");
  }
  return renderAtomicDropinV1({
    generation: {
      generation_id,
      configuration_sha256,
    },
    state: mode === "live_apply" ? LIVE_STATE : DORMANT_STATE,
    purpose: mode,
  });
}

function validateRuntimeStatus(value) {
  const status = exactKeys(
    value,
    [
      "parent_enabled",
      "root_dir",
      "full_runtime_enabled",
      "full_runtime_apply_enabled",
      "policy_configured",
      "signing_dependency_env_configured",
      "full_runtime_policy_fingerprint_sha256",
      "runtime_policy_fingerprint_sha256",
      "preparation_policy_fingerprint_sha256",
      "receipt_policy_fingerprint_sha256",
      "history_carrier_authority_id",
      "history_carrier_generation",
      "history_carrier_activation_ready",
      "history_carrier_activation_hold_reason",
      "claimed_runtime_enabled",
      "admitted_runtime_enabled",
      "claimed_full_runtime_enabled",
      "claimed_full_runtime_apply_enabled",
    ],
    "runtime_status",
  );
  if (
    status.parent_enabled !== true ||
    status.root_dir !==
      "/home/zoso/dev/void-node/data_a/buy_void_v1/runtime-integration-v1" ||
    status.full_runtime_enabled !== false ||
    status.full_runtime_apply_enabled !== false ||
    status.policy_configured !== true ||
    status.signing_dependency_env_configured !== true ||
    status.history_carrier_activation_ready !== true ||
    status.history_carrier_activation_hold_reason !== "" ||
    status.claimed_runtime_enabled !== false ||
    status.admitted_runtime_enabled !== false ||
    status.claimed_full_runtime_enabled !== false ||
    status.claimed_full_runtime_apply_enabled !== false
  ) {
    fail("runtime_status_not_activation_ready_dormant");
  }
  for (const [key, expected] of Object.entries(EXPECTED_RUNTIME_STATUS)) {
    if (status[key] !== expected) {
      fail("runtime_status_fingerprint_mismatch:" + key);
    }
  }
  return status;
}

function validatePostgresQualification(value) {
  const q = exactKeys(
    value,
    [
      "status",
      "configuration_fingerprint_sha256",
      "schema_fingerprint_sha256",
      "credential_read_performed",
      "credential_content_output",
      "loopback_postgres_tls_connect_performed",
      "schema_query_performed",
      "database_mutation_performed",
      "full_runtime_enabled",
      "full_runtime_apply_enabled",
      "claimed_runtime_enabled",
      "admitted_guarded_runtime_enabled",
      "worker_invoked",
      "transaction_broadcast_performed",
      "funds_movement_performed",
    ],
    "postgres_qualification",
  );
  if (
    q.status !== "POSTGRES_FACTORY_AND_SCHEMA_ADMITTED_DORMANT" ||
    q.configuration_fingerprint_sha256 !==
      EXPECTED_POSTGRES_QUALIFICATION.configuration_fingerprint_sha256 ||
    q.schema_fingerprint_sha256 !==
      EXPECTED_POSTGRES_QUALIFICATION.schema_fingerprint_sha256 ||
    q.credential_read_performed !== true ||
    q.credential_content_output !== false ||
    q.loopback_postgres_tls_connect_performed !== true ||
    q.schema_query_performed !== true ||
    q.database_mutation_performed !== false ||
    q.full_runtime_enabled !== false ||
    q.full_runtime_apply_enabled !== false ||
    q.claimed_runtime_enabled !== false ||
    q.admitted_guarded_runtime_enabled !== false ||
    q.worker_invoked !== false ||
    q.transaction_broadcast_performed !== false ||
    q.funds_movement_performed !== false
  ) {
    fail("postgres_qualification_invalid");
  }
  return q;
}

export async function evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1(
  snapshot,
  activationContract,
) {
  const root = exactKeys(
    snapshot,
    [
      "marker",
      "version",
      "host",
      "gate_sources",
      "configured_gates",
      "process_gates",
      "runtime_status",
      "postgres_qualification",
    ],
    "snapshot",
  );
  if (
    root.marker !==
      VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1 ||
    root.version !== 1
  ) {
    fail("snapshot_identity_invalid");
  }

  const host = exactKeys(
    root.host,
    [
      "hostname",
      "repo_root",
      "branch",
      "head_sha",
      "repository_tree_sha",
      "remote_main_sha",
      "canonical_remote_url",
      "reviewed_anchor_is_ancestor",
      "reviewed_source_slice_green",
      "source_slice_manifest_sha256",
      "source_slice_count",
      "preflight_wrapper_git_blob_sha1",
      "preflight_tool_git_blob_sha1",
      "worktree_clean",
      "service_unit",
      "active_state",
      "sub_state",
      "main_pid",
      "process_cwd",
    ],
    "host",
  );
  if (
    host.hostname !== "zoso-Precision-Tower-7810" ||
    host.repo_root !== "/home/zoso/dev/void-node" ||
    host.branch !== "main" ||
    typeof host.head_sha !== "string" ||
    !/^[0-9a-f]{40}$/u.test(host.head_sha) ||
    typeof host.repository_tree_sha !== "string" ||
    !/^[0-9a-f]{40}$/u.test(host.repository_tree_sha) ||
    typeof host.remote_main_sha !== "string" ||
    !/^[0-9a-f]{40}$/u.test(host.remote_main_sha) ||
    host.head_sha !== host.remote_main_sha ||
    host.canonical_remote_url !==
      "https://github.com/6ZoSo9/void-node.git" ||
    host.reviewed_anchor_is_ancestor !== true ||
    host.reviewed_source_slice_green !== true ||
    typeof host.source_slice_manifest_sha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(host.source_slice_manifest_sha256) ||
    host.source_slice_count !== 22 ||
    typeof host.preflight_wrapper_git_blob_sha1 !== "string" ||
    !/^[0-9a-f]{40}$/u.test(host.preflight_wrapper_git_blob_sha1) ||
    typeof host.preflight_tool_git_blob_sha1 !== "string" ||
    !/^[0-9a-f]{40}$/u.test(host.preflight_tool_git_blob_sha1) ||
    host.worktree_clean !== true ||
    host.service_unit !== "void-node-live.service" ||
    host.active_state !== "active" ||
    host.sub_state !== "running" ||
    !Number.isSafeInteger(host.main_pid) ||
    host.main_pid <= 0 ||
    host.process_cwd !== host.repo_root
  ) {
    fail("host_source_or_service_alignment_required");
  }

  const configured = normalizeGateState(
    root.configured_gates,
    "configured_gates",
  );
  const processState = normalizeGateState(
    root.process_gates,
    "process_gates",
  );
  if (
    !sameObject(configured, DORMANT_STATE) ||
    !sameObject(processState, DORMANT_STATE)
  ) {
    fail("configured_or_process_gate_state_not_dormant");
  }
  if (!sameObject(configured, processState)) {
    fail("configured_process_gate_state_mismatch");
  }

  const inventory = evaluateGateSourceInventoryV1(root.gate_sources);
  if (
    inventory.unreviewed.length !== 0 ||
    inventory.complete !== true
  ) {
    return Object.freeze({
      marker:
        VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1,
      version: 1,
      status:
        inventory.unreviewed.length !== 0
          ? "HOLD_UNRECONCILED_GATE_ASSIGNMENT_SOURCES"
          : "HOLD_GATE_SOURCE_INVENTORY_INCOMPLETE",
      activation_ready: false,
      reviewed_gate_sources: inventory.reviewed,
      unreviewed_gate_sources: inventory.unreviewed,
      gate_source_inventory_complete: inventory.complete,
      configured_gates: configured,
      process_gates: processState,
      credential_read_performed: false,
      database_connection_performed: false,
      runtime_gate_mutation_performed: false,
      service_mutation_performed: false,
      transaction_broadcast_performed: false,
      funds_movement_performed: false,
      authority:
        VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_AUTHORITY_V1,
    });
  }

  validateRuntimeStatus(root.runtime_status);
  validatePostgresQualification(root.postgres_qualification);

  if (
    !activationContract ||
    typeof activationContract.deriveBuyVoidPostgresActivationConfigurationGenerationV1 !==
      "function" ||
    typeof activationContract.decideBuyVoidPostgresActivationTransitionV1 !==
      "function"
  ) {
    fail("activation_contract_api_invalid");
  }

  const dormantGeneration =
    activationContract.deriveBuyVoidPostgresActivationConfigurationGenerationV1(
      DORMANT_STATE,
    );
  const liveGeneration =
    activationContract.deriveBuyVoidPostgresActivationConfigurationGenerationV1(
      LIVE_STATE,
    );
  if (!dormantGeneration || !liveGeneration) {
    fail("activation_generation_derivation_failed");
  }
  const forward =
    activationContract.decideBuyVoidPostgresActivationTransitionV1(
      DORMANT_STATE,
      LIVE_STATE,
      "atomic_restart",
      liveGeneration,
    );
  const rollback =
    activationContract.decideBuyVoidPostgresActivationTransitionV1(
      LIVE_STATE,
      DORMANT_STATE,
      "atomic_restart",
      dormantGeneration,
    );
  if (
    forward?.ok !== true ||
    forward?.status !== "atomic_forward" ||
    forward?.configuration_generation_id !== liveGeneration.generation_id ||
    forward?.configuration_sha256 !== liveGeneration.configuration_sha256 ||
    rollback?.ok !== true ||
    rollback?.status !== "atomic_rollback" ||
    rollback?.configuration_generation_id !== dormantGeneration.generation_id ||
    rollback?.configuration_sha256 !== dormantGeneration.configuration_sha256
  ) {
    fail("activation_contract_atomic_transition_rejected");
  }

  const liveDropin = renderAtomicDropinV1({
    generation: liveGeneration,
    state: LIVE_STATE,
    purpose: "live_apply",
  });
  const dormantDropin = renderAtomicDropinV1({
    generation: dormantGeneration,
    state: DORMANT_STATE,
    purpose: "dormant_rollback",
  });

  return Object.freeze({
    marker: VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1,
    version: 1,
    status: "ATOMIC_ACTIVATION_PREFLIGHT_GREEN_NOT_AUTHORIZED",
    activation_ready: true,
    activation_authorized: false,
    reviewed_main_anchor_sha:
      VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_REVIEWED_MAIN_ANCHOR_V1,
    repository_head_sha: host.head_sha,
    repository_tree_sha: host.repository_tree_sha,
    remote_main_sha: host.remote_main_sha,
    canonical_remote_url: host.canonical_remote_url,
    reviewed_source_slice_green: true,
    source_slice_manifest_sha256: host.source_slice_manifest_sha256,
    source_slice_count: host.source_slice_count,
    preflight_wrapper_git_blob_sha1: host.preflight_wrapper_git_blob_sha1,
    preflight_tool_git_blob_sha1: host.preflight_tool_git_blob_sha1,
    reviewed_gate_sources: inventory.reviewed,
    unreviewed_gate_sources: Object.freeze([]),
    gate_source_inventory_complete: true,
    configured_gates: configured,
    process_gates: processState,
    live_configuration_generation_id: liveGeneration.generation_id,
    live_configuration_sha256: liveGeneration.configuration_sha256,
    live_dropin_basename: liveDropin.basename,
    live_dropin_sha256: liveDropin.sha256,
    live_dropin_bytes: liveDropin.bytes,
    dormant_configuration_generation_id: dormantGeneration.generation_id,
    dormant_configuration_sha256: dormantGeneration.configuration_sha256,
    dormant_dropin_basename: dormantDropin.basename,
    dormant_dropin_sha256: dormantDropin.sha256,
    dormant_dropin_bytes: dormantDropin.bytes,
    staging_directory_required_outside_active_dropin_tree: true,
    exact_live_and_rollback_bytes_required_before_apply: true,
    install_daemon_reload_restart_single_transaction_required: true,
    post_restart_status_requalification_required: true,
    runtime_gate_mutation_performed: false,
    service_mutation_performed: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
    authority:
      VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_AUTHORITY_V1,
  });
}

async function loadActivationContract(repoRoot) {
  const target = path.join(
    repoRoot,
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts",
  );
  return import(pathToFileURL(target).href);
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (direct) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2) {
      fail(
        "usage: --gate-sources /absolute/gate-sources.json | " +
          "--snapshot /absolute/preflight-snapshot.json",
      );
    }

    if (args[0] === "--gate-sources") {
      const inputPath = args[1];
      if (
        !path.isAbsolute(inputPath) ||
        path.resolve(inputPath) !== inputPath
      ) {
        fail("gate_sources_path_invalid");
      }
      const entries = JSON.parse(fs.readFileSync(inputPath, "utf8"));
      const inventory = evaluateGateSourceInventoryV1(entries);
      console.log(
        VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1,
      );
      console.log("phase=gate_source_inventory");
      console.log(
        "reviewed_gate_source_count=" +
          String(inventory.reviewed.length),
      );
      console.log(
        "unreviewed_gate_source_count=" +
          String(inventory.unreviewed.length),
      );
      console.log(
        "gate_source_inventory_complete=" +
          String(inventory.complete),
      );
      for (const source of inventory.unreviewed) {
        console.log(
          "unreviewed_gate_source=" +
            source.path +
            "|sha256=" +
            source.sha256,
        );
        for (const [name, value] of Object.entries(source.assignments)) {
          console.log(
            "unreviewed_gate_assignment=" +
              source.path +
              "|" +
              name +
              "=" +
              value,
          );
        }
      }
      console.log("credential_read_performed=false");
      console.log("database_connection_performed=false");
      console.log("runtime_gate_mutation_performed=false");
      console.log("service_mutation_performed=false");
      if (
        inventory.unreviewed.length !== 0 ||
        inventory.complete !== true
      ) {
        console.log(
          "status=" +
            (inventory.unreviewed.length !== 0
              ? "HOLD_UNRECONCILED_GATE_ASSIGNMENT_SOURCES"
              : "HOLD_GATE_SOURCE_INVENTORY_INCOMPLETE"),
        );
        process.exitCode = 2;
      } else {
        console.log("status=GATE_SOURCE_INVENTORY_GREEN");
        console.log(
          "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_GATE_SOURCE_INVENTORY_V1_GREEN",
        );
      }
    } else if (args[0] === "--snapshot") {
      const snapshotPath = args[1];
      if (
        !path.isAbsolute(snapshotPath) ||
        path.resolve(snapshotPath) !== snapshotPath
      ) {
        fail("snapshot_path_invalid");
      }
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
      const repoRoot = snapshot?.host?.repo_root;
      if (typeof repoRoot !== "string" || !path.isAbsolute(repoRoot)) {
        fail("snapshot_repo_root_invalid");
      }
      const contract = await loadActivationContract(repoRoot);
      const result =
        await evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1(
          snapshot,
          contract,
        );
      console.log(
        VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1,
      );
      console.log("phase=full_preflight");
      console.log("status=" + result.status);
      console.log("activation_ready=" + String(result.activation_ready));
      console.log("activation_authorized=false");
      console.log(
        "unreviewed_gate_source_count=" +
          String(result.unreviewed_gate_sources.length),
      );
      if (result.activation_ready === true) {
        console.log("canonical_remote_url=" + result.canonical_remote_url);
        console.log("repository_head_sha=" + result.repository_head_sha);
        console.log("repository_tree_sha=" + result.repository_tree_sha);
        console.log("remote_main_sha=" + result.remote_main_sha);
        console.log(
          "source_slice_manifest_sha256=" +
            result.source_slice_manifest_sha256,
        );
        console.log("source_slice_count=" + String(result.source_slice_count));
        console.log(
          "preflight_wrapper_git_blob_sha1=" +
            result.preflight_wrapper_git_blob_sha1,
        );
        console.log(
          "preflight_tool_git_blob_sha1=" +
            result.preflight_tool_git_blob_sha1,
        );
        console.log("reviewed_source_slice_green=true");
        console.log(
          "live_configuration_generation_id=" +
            result.live_configuration_generation_id,
        );
        console.log(
          "live_configuration_sha256=" +
            result.live_configuration_sha256,
        );
        console.log("live_dropin_sha256=" + result.live_dropin_sha256);
        console.log(
          "dormant_configuration_generation_id=" +
            result.dormant_configuration_generation_id,
        );
        console.log(
          "dormant_configuration_sha256=" +
            result.dormant_configuration_sha256,
        );
        console.log(
          "dormant_dropin_sha256=" + result.dormant_dropin_sha256,
        );
      }
      console.log("runtime_gate_mutation_performed=false");
      console.log("service_mutation_performed=false");
      console.log("transaction_broadcast_performed=false");
      console.log("funds_movement_performed=false");
      console.log(
        "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1_DONE",
      );
      if (result.activation_ready !== true) process.exitCode = 2;
    } else {
      fail("unknown_mode");
    }
  } catch (error) {
    console.error(
      "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1_HOLD",
    );
    console.error(
      "reason=" +
        (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 2;
  }
}
