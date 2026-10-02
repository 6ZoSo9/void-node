#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1 =
  "VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1";

export const VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_AUTHORITY_V1 =
  Object.freeze({
    observer_read_only: true,
    canonical_main_live_read: true,
    activation_lineage_rederived: true,
    activation_plan_upstream_reexecution_required: true,
    exact_upstream_activation_artifacts_required: true,
    reviewed_git_object_execution_required: true,
    private_reviewed_execution_tree_required: true,
    reviewed_execution_bytes_rebound_before_and_after: true,
    worktree_semantic_import_forbidden: true,
    systemd_read_only: true,
    listener_read_only: true,
    rootless_docker_read_only: true,
    container_inspection_read_only: true,
    service_container_listener_binding_required: true,
    container_generation_stable_required: true,
    rpc_read_only: true,
    service_action: false,
    docker_mutation: false,
    daemon_reload: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    validator_mutation: false,
    migration_authorized: false,
    market_activation: false,
    public_presale_activation: false,
    token_movement: false,
    inventory_funding: false,
    liquidity_movement: false,
    funds_movement: false,
    activation_source_ancestry_required: true,
    private_output_parent_fd_bound: true,
    private_output_exact_directory_fsync: true,
    private_output_redirect_forbidden: true,
    target_descriptor_promotion: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL_REL = "tools/void-production-epoch2-rpc-host-observer-v1.mjs";
const GIT = "/usr/bin/git";
const SYSTEMCTL = "/usr/bin/systemctl";
const SS = "/usr/bin/ss";
const TAR = "/usr/bin/tar";
const HOLD_STATUS = "HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED";
const ACTIVATION_REL =
  "tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";
const TARGET_REL = "tools/void-production-epoch2-rpc-target-v1.mjs";
const REVIEWED_EXECUTION_PATHS = Object.freeze([
  ACTIVATION_REL,
  "tools/void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-install-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-plan-v1.mjs",
  TARGET_REL,
  "ops/mainnet0/production-epoch2-rpc-target-v1.json",
  "ops/mainnet0/economic-epoch2-public-read-runtime-contract-v1.json",
  "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
  "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json",
  "ops/mainnet0/economic-epoch2-production-successor-equivalence-evidence-v1.json",
  "ops/mainnet0/economic-epoch2-production-successor-equivalence-promotion-v1.json",
  "ops/precision/void-precision-epoch2-qbft-private-runtime-activate-v1.mjs",
]);
const CANONICAL_REMOTE = "https://github.com/6ZoSo9/void-node.git";
const ORIGINS = new Set([
  "https://github.com/6ZoSo9/void-node",
  "https://github.com/6ZoSo9/void-node.git",
  "git@github.com:6ZoSo9/void-node.git",
  "ssh://git@github.com/6ZoSo9/void-node.git",
]);
const SERVICE = "void-economic-epoch2-qbft-validator-v1.service";
const RPC_URL = "http://127.0.0.1:18553/";
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const INVOCATION = /^[0-9a-f]{32}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_FILE = 8 * 1024 * 1024;
const MAX_RPC = 1024 * 1024;
const MAX_DOCKER_RESPONSE = 4 * 1024 * 1024;

function fail(code) { throw new Error(code); }
function plain(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function canonical(v) {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number" && Number.isSafeInteger(v)) return String(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (plain(v)) {
    return "{" + Object.keys(v).sort().map(
      (k) => JSON.stringify(k) + ":" + canonical(v[k]),
    ).join(",") + "}";
  }
  fail("PRODUCTION_EPOCH2_RPC_OBSERVER_CANONICAL_VALUE_INVALID");
}
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes).digest("hex");
}
function pretty(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}
function parseBytes(bytes, expected, label) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > MAX_FILE) {
    fail(label + "_BYTES_INVALID");
  }
  if (!HEX64.test(String(expected || ""))) fail(label + "_SHA256_INVALID");
  if (sha256(bytes) !== expected) fail(label + "_SHA256_MISMATCH");
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail(label + "_JSON_INVALID");
  }
  if (!plain(value)) fail(label + "_JSON_NOT_OBJECT");
  return Object.freeze({ value, sha256: expected });
}
function decimal(value, code) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  return BigInt(value);
}
function quantity(value, code) {
  const text = String(value || "").toLowerCase();
  if (!/^0x(?:0|[1-9a-f][0-9a-f]*)$/u.test(text)) fail(code);
  return BigInt(text);
}
function same(left, right) {
  return canonical(left) === canonical(right);
}
function validSource(s) {
  return (
    plain(s) &&
    s.branch === "main" &&
    HEX40.test(String(s.head || "")) &&
    HEX40.test(String(s.tree || "")) &&
    s.remote_main_sha === s.head &&
    s.canonical_remote_url === CANONICAL_REMOTE &&
    s.canonical_main_live_match === true
  );
}

function reviewedPrecisionContainerContract(reviewed, activationPlan) {
  const privatePlan = reviewed?.private_runtime_plan;
  if (
    !plain(privatePlan) ||
    privatePlan.marker !==
      "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1" ||
    privatePlan.status !== "PRIVATE_QBFT_RUNTIME_PLAN_READY_ACTIVATION_HOLD" ||
    !plain(privatePlan.runtime) ||
    typeof privatePlan.runtime.besu_image !== "string" ||
    !Array.isArray(privatePlan.hosts)
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_PRIVATE_RUNTIME_PLAN_INVALID");
  }
  const precisionHost =
    privatePlan.hosts.find((row) => row?.role === "precision");
  const precisionInstall =
    activationPlan.install_receipts.find((row) => row?.role === "precision");
  if (
    !plain(precisionHost) ||
    !plain(precisionInstall) ||
    precisionHost.hostname !== "zoso-Precision-Tower-7810" ||
    precisionHost.container_name !== "void-e2-qbft-precision-v1" ||
    precisionHost.service_name !== SERVICE ||
    precisionHost.rpc?.enabled !== true ||
    precisionHost.rpc?.host_publish !== "127.0.0.1:18553:8545/tcp" ||
    precisionHost.rpc?.loopback_url !== RPC_URL ||
    !Array.isArray(precisionHost.besu_args) ||
    precisionHost.besu_args.length < 1
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_PRECISION_RUNTIME_CONTRACT_INVALID");
  }
  const runtimeRoot = String(precisionInstall.runtime_root || "");
  const suffix =
    "/.local/share/void/epoch2-qbft-private-runtime-v1/precision";
  if (!runtimeRoot.endsWith(suffix)) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_RUNTIME_ROOT_INVALID");
  }
  const home = runtimeRoot.slice(0, -suffix.length);
  if (!path.isAbsolute(home) || path.resolve(home) !== home) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_HOME_INVALID");
  }
  const expectedDockerHost =
    "unix:///run/user/" + String(process.getuid()) + "/docker.sock";
  const binds = [
    path.join(home, precisionHost.nodekey_path_relative) +
      ":/key/nodekey:ro",
    runtimeRoot + "/genesis.json:/config/genesis.json:ro",
    runtimeRoot + "/static-nodes.json:/config/static-nodes.json:ro",
    path.join(home, precisionHost.plugin_path_relative) +
      ":/plugins/void-epoch2-raw-transaction-domain-plugin-v1.jar:ro",
    runtimeRoot + "/data:/data",
  ];
  const p2p = String(precisionHost.p2p?.host_publish || "")
    .match(/^([^:]+):([0-9]+):([0-9]+)\/tcp$/u);
  if (!p2p || p2p[3] !== "30313") {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_P2P_PUBLISH_INVALID");
  }
  return Object.freeze({
    docker_host: expectedDockerHost,
    container_name: precisionHost.container_name,
    image_reference: privatePlan.runtime.besu_image,
    entrypoint: Object.freeze(["/opt/besu/bin/besu"]),
    command: Object.freeze([...precisionHost.besu_args]),
    binds: Object.freeze([...binds].sort()),
    port_bindings: Object.freeze([
      Object.freeze({
        container_port: "30313/tcp",
        host_ip: p2p[1],
        host_port: p2p[2],
      }),
      Object.freeze({
        container_port: "8545/tcp",
        host_ip: "127.0.0.1",
        host_port: "18553",
      }),
    ]),
  });
}

function validateContainerObservation(container, expected) {
  if (
    !plain(container) ||
    container.docker_host !== expected.docker_host ||
    container.container_name !== expected.container_name ||
    !/^[0-9a-f]{64}$/u.test(String(container.container_id || "")) ||
    /^0{64}$/u.test(String(container.container_id || "")) ||
    container.image_reference !== expected.image_reference ||
    !/^sha256:[0-9a-f]{64}$/u.test(String(container.image_id || "")) ||
    /^sha256:0{64}$/u.test(String(container.image_id || "")) ||
    container.running !== true ||
    typeof container.started_at_utc !== "string" ||
    container.started_at_utc.length < 20 ||
    container.auto_remove !== true ||
    container.user !== "0:0" ||
    canonical(container.entrypoint) !== canonical(expected.entrypoint) ||
    canonical(container.command) !== canonical(expected.command) ||
    canonical([...(container.binds || [])].sort()) !==
      canonical(expected.binds) ||
    canonical(container.port_bindings) !== canonical(expected.port_bindings) ||
    container.besu_plugins_env_verified !== true ||
    container.cap_drop_all !== true ||
    container.no_new_privileges !== true ||
    container.rootless_security_verified !== true ||
    container.docker_socket_owner_uid !== String(process.getuid()) ||
    container.systemd_exec_start_matches_reviewed_contract !== true
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_CONTAINER_IDENTITY_INVALID");
  }
  return Object.freeze({ ...container });
}

export function buildVoidProductionEpoch2RpcHostObservationV1(input) {
  if (!plain(input)) fail("PRODUCTION_EPOCH2_RPC_OBSERVER_INPUT_INVALID");

  const p = parseBytes(
    input.activation_plan_bytes,
    input.activation_plan_file_sha256,
    "PRODUCTION_EPOCH2_RPC_OBSERVER_ACTIVATION_PLAN",
  );
  const r = parseBytes(
    input.activation_receipt_bytes,
    input.activation_receipt_file_sha256,
    "PRODUCTION_EPOCH2_RPC_OBSERVER_ACTIVATION_RECEIPT",
  );
  const reviewed = input.reviewed_semantic;
  if (
    !plain(reviewed) ||
    reviewed.reviewed_execution_verified !== true ||
    !plain(reviewed.activation_plan) ||
    !plain(reviewed.activation_receipt) ||
    !plain(reviewed.private_runtime_plan) ||
    !plain(reviewed.target_value) ||
    !Array.isArray(reviewed.expected_validators) ||
    reviewed.target_status !== HOLD_STATUS ||
    reviewed.target_selected !== false ||
    !HEX64.test(String(reviewed.rpc_url_fingerprint_sha256 || "")) ||
    !same(reviewed.activation_plan, p.value) ||
    !same(reviewed.activation_receipt, r.value)
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_SEMANTIC_INVALID");
  }
  const plan = reviewed.activation_plan;
  const receipt = reviewed.activation_receipt;
  const targetValue = reviewed.target_value;
  const expectedContainer =
    reviewedPrecisionContainerContract(reviewed, plan);
  const identity = targetValue.reviewed_successor_identity;
  if (
    identity?.prospective_production_rpc_url !== RPC_URL ||
    identity?.prospective_production_service_unit !== SERVICE
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_TARGET_DESCRIPTOR_INVALID");
  }

  const source = input.source_binding;
  const host = input.host_observation;
  if (
    !validSource(source) ||
    !plain(host) ||
    reviewed.reviewed_source_head_sha !== source.head ||
    reviewed.reviewed_source_tree_sha !== source.tree ||
    !HEX64.test(String(reviewed.reviewed_execution_manifest_sha256 || ""))
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_SOURCE_OR_HOST_INVALID");
  }
  if (
    host.hostname !== "zoso-Precision-Tower-7810" ||
    host.service_unit !== SERVICE ||
    host.active_state !== "active" ||
    host.sub_state !== "running" ||
    !/^[1-9][0-9]*$/u.test(String(host.main_pid || "")) ||
    !INVOCATION.test(String(host.invocation_id || "")) ||
    host.drop_in_paths !== "" ||
    host.listener_address !== "127.0.0.1" ||
    host.listener_port !== 18553 ||
    host.listener_present !== true ||
    host.canonical_main_stable_during_observation !== true ||
    host.service_invocation_stable_during_observation !== true ||
    host.listener_stable_during_observation !== true ||
    host.container_stable_during_observation !== true ||
    host.service_container_contract_verified !== true ||
    host.activation_source_lineage_ancestor_current_main !== true ||
    host.activation_plan_rederived_from_upstream !== true
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_SERVICE_OR_LISTENER_INVALID");
  }

  const precision = plan.install_receipts.find((row) => row.role === "precision");
  if (
    !precision ||
    host.fragment_path !== precision.unit_install_path ||
    host.fragment_file_sha256 !== precision.systemd_unit_sha256 ||
    !HEX64.test(String(host.fragment_file_sha256 || ""))
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_UNIT_IDENTITY_MISMATCH");
  }

  const container =
    validateContainerObservation(host.container, expectedContainer);

  const rpc = host.rpc;
  const validators = Array.isArray(rpc?.validators)
    ? rpc.validators.map((v) => String(v).toLowerCase())
    : [];
  if (
    !plain(rpc) ||
    rpc.url !== RPC_URL ||
    rpc.chain_id_hex !== "0x802" ||
    rpc.chain_id !== 2050 ||
    rpc.execution_epoch !== 2 ||
    rpc.genesis_block_number !== "0" ||
    String(rpc.genesis_block_hash || "").toLowerCase() !==
      identity.genesis_block_hash ||
    String(rpc.genesis_state_root || "").toLowerCase() !==
      identity.genesis_state_root ||
    !UINT.test(String(rpc.head_block_number || "")) ||
    !HASH.test(String(rpc.head_block_hash || "").toLowerCase()) ||
    !HASH.test(String(rpc.head_state_root || "").toLowerCase()) ||
    !Number.isSafeInteger(rpc.peer_count) ||
    rpc.peer_count < 2 ||
    JSON.stringify([...validators].sort()) !==
      JSON.stringify(
        reviewed.expected_validators.map((v) => String(v).toLowerCase()).sort(),
      )
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_RPC_IDENTITY_MISMATCH");
  }
  if (
    decimal(rpc.head_block_number, "PRODUCTION_EPOCH2_RPC_OBSERVER_HEAD_INVALID") <
    decimal(
      receipt.observations.after_xiphos_block_number,
      "PRODUCTION_EPOCH2_RPC_OBSERVER_ACTIVATION_FLOOR_INVALID",
    )
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_HEAD_BELOW_ACTIVATION_FLOOR");
  }

  const upstream = host.activation_upstream;
  if (
    !plain(upstream) ||
    !HEX64.test(String(upstream.private_runtime_plan_file_sha256 || "")) ||
    !HEX64.test(String(upstream.bundle_set_receipt_file_sha256 || "")) ||
    !HEX64.test(String(upstream.start_admission_receipt_file_sha256 || "")) ||
    !HEX64.test(String(upstream.install_precision_file_sha256 || "")) ||
    !HEX64.test(String(upstream.install_nimo_file_sha256 || "")) ||
    !HEX64.test(String(upstream.install_xiphos_file_sha256 || ""))
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_ACTIVATION_UPSTREAM_INVALID");
  }

  const observedAt = String(host.observed_at_utc || "");
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(observedAt) ||
    !Number.isFinite(Date.parse(observedAt)) ||
    Date.parse(observedAt) < Date.parse(receipt.activated_at_utc)
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_TIME_INVALID");
  }

  const material = Object.freeze({
    marker: VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1,
    version: 1,
    status: "PRODUCTION_EPOCH2_RPC_HOST_OBSERVATION_ACCEPTED",
    hostname: host.hostname,
    chain_id: 2050,
    execution_epoch: 2,
    source_binding: Object.freeze({ ...source }),
    target_descriptor: Object.freeze({
      status: reviewed.target_status,
      production_rpc_target_selected: false,
      prospective_rpc_url: RPC_URL,
      rpc_url_fingerprint_sha256:
        reviewed.rpc_url_fingerprint_sha256,
      prospective_service_unit: SERVICE,
      production_validator_binding_evidence_path:
        identity.production_validator_binding_evidence_path,
      production_validator_binding_evidence_sha256:
        identity.production_validator_binding_evidence_sha256,
      production_validator_binding_evidence_id:
        identity.production_validator_binding_evidence_id,
    }),
    reviewed_semantic_execution: Object.freeze({
      source_head_sha: reviewed.reviewed_source_head_sha,
      source_tree_sha: reviewed.reviewed_source_tree_sha,
      reviewed_execution_verified: true,
      private_reviewed_execution_tree: true,
      reviewed_execution_bytes_rebound_before_and_after: true,
      worktree_semantic_import: false,
      reviewed_execution_manifest_sha256:
        reviewed.reviewed_execution_manifest_sha256,
    }),
    activation_lineage: Object.freeze({
      activation_plan_id: plan.activation_plan_id,
      activation_plan_file_sha256: p.sha256,
      private_runtime_plan_file_sha256:
        host.activation_upstream.private_runtime_plan_file_sha256,
      bundle_set_receipt_file_sha256:
        host.activation_upstream.bundle_set_receipt_file_sha256,
      start_admission_receipt_file_sha256:
        host.activation_upstream.start_admission_receipt_file_sha256,
      install_receipt_file_sha256: Object.freeze({
        precision: host.activation_upstream.install_precision_file_sha256,
        nimo: host.activation_upstream.install_nimo_file_sha256,
        xiphos: host.activation_upstream.install_xiphos_file_sha256,
      }),
      activation_plan_rederived_from_upstream: true,
      activation_receipt_id: receipt.activation_receipt_id,
      activation_receipt_file_sha256: r.sha256,
      activated_at_utc: receipt.activated_at_utc,
      activation_receipt_rederived: true,
      activation_floor_block_number:
        receipt.observations.after_xiphos_block_number,
      source_lineage_ancestor_current_main: true,
    }),
    service: Object.freeze({
      service_unit: SERVICE,
      fragment_path: host.fragment_path,
      fragment_file_sha256: host.fragment_file_sha256,
      active_state: host.active_state,
      sub_state: host.sub_state,
      main_pid: String(host.main_pid),
      invocation_id: host.invocation_id,
      drop_in_paths: "",
      runtime_active_verified: true,
      listener_address: "127.0.0.1",
      listener_port: 18553,
      listener_present: true,
      invocation_stable_during_observation: true,
      listener_stable_during_observation: true,
      container_stable_during_observation: true,
      service_container_contract_verified: true,
    }),
    container: Object.freeze({
      docker_host: container.docker_host,
      container_name: container.container_name,
      container_id: container.container_id,
      image_reference: container.image_reference,
      image_id: container.image_id,
      running: true,
      started_at_utc: container.started_at_utc,
      auto_remove: true,
      user: container.user,
      entrypoint: Object.freeze([...container.entrypoint]),
      command: Object.freeze([...container.command]),
      binds: Object.freeze([...container.binds]),
      port_bindings: Object.freeze(
        container.port_bindings.map((row) => Object.freeze({ ...row })),
      ),
      besu_plugins_env_verified: true,
      cap_drop_all: true,
      no_new_privileges: true,
      rootless_security_verified: true,
      docker_socket_owner_uid: container.docker_socket_owner_uid,
      systemd_exec_start_matches_reviewed_contract: true,
    }),
    service_container_listener_binding_verified: true,
    rpc: Object.freeze({
      url: RPC_URL,
      chain_id_hex: "0x802",
      genesis_block_number: "0",
      genesis_block_hash: identity.genesis_block_hash,
      genesis_state_root: identity.genesis_state_root,
      head_block_number: rpc.head_block_number,
      head_block_hash: rpc.head_block_hash.toLowerCase(),
      head_state_root: rpc.head_state_root.toLowerCase(),
      peer_count: rpc.peer_count,
      validators: Object.freeze([...validators].sort()),
      exact_validator_set_verified: true,
      two_peer_minimum_verified: true,
      head_at_or_above_activation_floor: true,
      allowed_read_only_methods: Object.freeze([
        "eth_chainId",
        "eth_blockNumber",
        "eth_getBlockByNumber",
        "net_peerCount",
        "qbft_getValidatorsByBlockNumber",
      ]),
    }),
    write_capability_classification: "write_capable_not_authorized",
    exact_genesis_bound: true,
    production_validator_set_bound: true,
    independent_host_acceptance: true,
    target_descriptor_promotion_authorized: false,
    canonical_main_stable_during_observation: true,
    observed_at_utc: observedAt,
    authority: VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_AUTHORITY_V1,
  });

  return Object.freeze({
    ...material,
    observation_id:
      "voidpe2rpcobs1_" +
      sha256(Buffer.from(canonical(material), "utf8")),
  });
}

function gitEnv() {
  return {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/bin/false",
  };
}
function gitRaw(args, code, { cwd = ROOT, encoding = "utf8" } = {}) {
  const argv = [
    "--no-replace-objects",
    "-c", "core.hooksPath=/dev/null",
    "-c", "core.attributesFile=/dev/null",
    "-c", "core.fsmonitor=false",
    "-c", "core.untrackedCache=false",
    "-c", "core.preloadIndex=false",
    "-c", "submodule.recurse=false",
    ...(cwd === ROOT ? ["-C", ROOT] : []),
    ...args,
  ];
  const result = spawnSync(GIT, argv, {
    cwd,
    env: gitEnv(),
    encoding,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: MAX_FILE,
    timeout: 30_000,
  });
  if (result.error || result.status !== 0) fail(code);
  return result.stdout;
}
function gitText(args, code, options = {}) {
  return String(gitRaw(args, code, options) || "").trim();
}
function gitBytes(args, code, options = {}) {
  return Buffer.from(gitRaw(args, code, { ...options, encoding: null }));
}
function repoIdentity() {
  if (
    gitText(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "PRODUCTION_EPOCH2_RPC_OBSERVER_REPO_STATUS_UNAVAILABLE",
    ) !== ""
  ) fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REPO_DIRTY");

  const branch = gitText(
    ["branch", "--show-current"],
    "PRODUCTION_EPOCH2_RPC_OBSERVER_BRANCH_UNAVAILABLE",
  );
  if (branch !== "main") fail("PRODUCTION_EPOCH2_RPC_OBSERVER_MAIN_REQUIRED");

  const head = gitText(
    ["rev-parse", "HEAD"],
    "PRODUCTION_EPOCH2_RPC_OBSERVER_HEAD_UNAVAILABLE",
  );
  const tree = gitText(
    ["rev-parse", "HEAD^{tree}"],
    "PRODUCTION_EPOCH2_RPC_OBSERVER_TREE_UNAVAILABLE",
  );
  const origin = gitText(
    ["config", "--local", "--no-includes", "--get", "remote.origin.url"],
    "PRODUCTION_EPOCH2_RPC_OBSERVER_ORIGIN_UNAVAILABLE",
  );
  if (!ORIGINS.has(origin)) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_CANONICAL_ORIGIN_REQUIRED");
  }
  const remote = gitText(
    [
      "-c", "http.sslVerify=true",
      "ls-remote", "--heads", CANONICAL_REMOTE, "refs/heads/main",
    ],
    "PRODUCTION_EPOCH2_RPC_OBSERVER_REMOTE_MAIN_UNAVAILABLE",
    { cwd: "/" },
  );
  const match = remote.match(/^([0-9a-f]{40})\s+refs\/heads\/main$/u);
  if (!match || match[1] !== head) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REMOTE_MAIN_MISMATCH");
  }

  const reviewed = gitBytes(
    ["show", "HEAD:" + TOOL_REL],
    "PRODUCTION_EPOCH2_RPC_OBSERVER_TOOL_BYTES_UNAVAILABLE",
  );
  const work = fs.readFileSync(path.join(ROOT, TOOL_REL));
  if (gitBlob(reviewed) !== gitBlob(work)) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_TOOL_WORKTREE_DRIFT");
  }
  return Object.freeze({
    branch,
    head,
    tree,
    canonical_remote_url: CANONICAL_REMOTE,
    remote_main_sha: head,
    canonical_main_live_match: true,
  });
}
function commitIdentity(head, relativePath) {
  const bytes = gitBytes(
    ["show", head + ":" + relativePath],
    "PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_BYTES_UNAVAILABLE:" + relativePath,
  );
  if (bytes.length < 1 || bytes.length > MAX_FILE) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_BYTES_INVALID:" + relativePath);
  }
  const blob = gitText(
    ["rev-parse", head + ":" + relativePath],
    "PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_BLOB_UNAVAILABLE:" + relativePath,
  );
  if (!HEX40.test(blob) || gitBlob(bytes) !== blob) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_BLOB_MISMATCH:" + relativePath);
  }
  return Object.freeze({
    path: relativePath,
    git_blob_sha1: blob,
    file_sha256: sha256(bytes),
  });
}
function reviewedExecutionManifest(head) {
  const files = Object.fromEntries(
    REVIEWED_EXECUTION_PATHS.map((relativePath) => {
      const identity = commitIdentity(head, relativePath);
      return [relativePath, Object.freeze({
        git_blob_sha1: identity.git_blob_sha1,
        file_sha256: identity.file_sha256,
      })];
    }),
  );
  return Object.freeze({
    files: Object.freeze(files),
    manifest_sha256:
      sha256(Buffer.from(canonical(files), "utf8")),
  });
}
function verifyReviewedTree(root, manifest) {
  for (const [relativePath, expected] of Object.entries(manifest.files)) {
    const file = path.join(root, relativePath);
    const bytes = readStable(
      file,
      "PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_TREE:" + relativePath,
    );
    if (
      sha256(bytes) !== expected.file_sha256 ||
      gitBlob(bytes) !== expected.git_blob_sha1
    ) {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_TREE_DRIFT:" + relativePath);
    }
  }
}
function privateChildEnv(home) {
  return {
    PATH: "/usr/bin:/bin",
    HOME: home,
    XDG_CONFIG_HOME: home,
    LANG: "C",
    LC_ALL: "C",
    NODE_OPTIONS: "",
    NODE_PATH: "",
  };
}
function reviewedSemanticExecution(repo, request) {
  const manifest = reviewedExecutionManifest(repo.head);
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-production-epoch2-rpc-reviewed-"),
  );
  fs.chmodSync(root, 0o700);
  const sourceRoot = path.join(root, "source");
  const runnerRoot = path.join(root, "runner");
  const archive = path.join(root, "source.tar");
  fs.mkdirSync(sourceRoot, { mode: 0o700 });
  fs.mkdirSync(runnerRoot, { mode: 0o700 });
  try {
    gitRaw(
      ["archive", "--format=tar", "--output=" + archive, repo.head],
      "PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_ARCHIVE_FAILED",
    );
    const tar = spawnSync(
      TAR,
      ["-xf", archive, "-C", sourceRoot],
      {
        cwd: "/",
        env: privateChildEnv(runnerRoot),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
      },
    );
    if (tar.error || tar.status !== 0) {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_ARCHIVE_EXTRACT_FAILED");
    }
    fs.unlinkSync(archive);
    verifyReviewedTree(sourceRoot, manifest);

    const activationUrl = pathToFileURL(path.join(sourceRoot, ACTIVATION_REL)).href;
    const targetUrl = pathToFileURL(path.join(sourceRoot, TARGET_REL)).href;
    const runnerSource = [
      "import {",
      "  EXPECTED_VALIDATORS_V1,",
      "  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1,",
      "  compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,",
      "} from " + JSON.stringify(activationUrl) + ";",
      "import {",
      "  HOLD_STATUS,",
      "  loadProductionEpoch2RpcTargetV1,",
      "  productionEpoch2RpcUrlFingerprintV1,",
      "} from " + JSON.stringify(targetUrl) + ";",
      'function plain(v){return v!==null&&typeof v==="object"&&!Array.isArray(v);}',
      'function canonical(v){',
      '  if(v===null)return "null";',
      '  if(typeof v==="string")return JSON.stringify(v);',
      '  if(typeof v==="boolean")return v?"true":"false";',
      '  if(typeof v==="number"&&Number.isSafeInteger(v))return String(v);',
      '  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";',
      '  if(plain(v))return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";',
      '  throw new Error("canonical_value_invalid");',
      '}',
      'process.stdin.setEncoding("utf8");',
      'let text="";',
      'for await(const chunk of process.stdin) text+=chunk;',
      "try{",
      "  const q=JSON.parse(text);",
      "  const plan=compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1({",
      "    plan:q.private_runtime_plan,",
      "    plan_file_sha256:q.private_runtime_plan_file_sha256,",
      "    bundle_set_receipt:q.bundle_set,",
      "    install_receipts:q.install_receipts,",
      "    start_admission_receipt:q.start_admission,",
      "    compiled_at_utc:q.activation_plan.compiled_at_utc,",
      "  });",
      '  if(canonical(plan)!==canonical(q.activation_plan)) throw new Error("activation_plan_rederivation_mismatch");',
      "  const o=q.activation_receipt.observations;",
      "  const receipt=buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({",
      "    activation_plan:plan,",
      "    activated_at_utc:q.activation_receipt.activated_at_utc,",
      "    observed:{",
      "      validators:q.activation_receipt.validators,",
      "      precision_only_block_number:o?.precision_only_block_number,",
      "      after_nimo_block_number:o?.after_nimo_block_number,",
      "      after_nimo_peer_count:o?.after_nimo_peer_count,",
      "      after_xiphos_block_number:o?.after_xiphos_block_number,",
      "      after_xiphos_peer_count:o?.after_xiphos_peer_count,",
      "      chain_id_hex:q.activation_receipt.chain_id_hex,",
      "      started_roles:q.activation_receipt.started_roles,",
      "    },",
      "  });",
      '  if(canonical(receipt)!==canonical(q.activation_receipt)) throw new Error("activation_receipt_rederivation_mismatch");',
      "  const target=loadProductionEpoch2RpcTargetV1();",
      '  if(target.evaluation.status!==HOLD_STATUS||target.evaluation.production_rpc_target_selected!==false) throw new Error("target_not_hold");',
      "  const result={",
      "    activation_plan:plan,",
      "    private_runtime_plan:q.private_runtime_plan,",
      "    activation_receipt:receipt,",
      "    expected_validators:[...EXPECTED_VALIDATORS_V1],",
      "    target_value:target.value,",
      "    target_status:target.evaluation.status,",
      "    target_selected:target.evaluation.production_rpc_target_selected,",
      "    rpc_url_fingerprint_sha256:productionEpoch2RpcUrlFingerprintV1(q.rpc_url),",
      "  };",
      "  process.stdout.write(JSON.stringify({ok:true,result,error:null}));",
      "}catch(error){",
      "  process.stdout.write(JSON.stringify({ok:false,result:null,error:(error instanceof Error?error.message:String(error)).slice(0,512)}));",
      "}",
      "",
    ].join("\\n");
    const runnerFile = path.join(runnerRoot, "reviewed-semantic-runner-v1.mjs");
    const runnerBytes = Buffer.from(runnerSource, "utf8");
    const runnerFd = fs.openSync(
      runnerFile,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL |
        Number(fs.constants.O_NOFOLLOW || 0),
      0o400,
    );
    try {
      fs.writeFileSync(runnerFd, runnerBytes);
      fs.fchmodSync(runnerFd, 0o400);
      fs.fsyncSync(runnerFd);
    } finally {
      fs.closeSync(runnerFd);
    }

    verifyReviewedTree(sourceRoot, manifest);
    const reboundRunner = readStable(
      runnerFile,
      "PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_RUNNER",
    );
    if (sha256(reboundRunner) !== sha256(runnerBytes)) {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_RUNNER_DRIFT");
    }

    const result = spawnSync(
      fs.realpathSync.native(process.execPath),
      [
        "--permission",
        "--allow-fs-read=" + root,
        runnerFile,
      ],
      {
        cwd: runnerRoot,
        env: privateChildEnv(runnerRoot),
        input: JSON.stringify(request),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 32 * 1024 * 1024,
        timeout: 60_000,
      },
    );
    if (result.error || result.status !== 0) {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_EXECUTION_FAILED");
    }
    verifyReviewedTree(sourceRoot, manifest);
    const reboundRunnerAfter = readStable(
      runnerFile,
      "PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_RUNNER_AFTER",
    );
    if (sha256(reboundRunnerAfter) !== sha256(runnerBytes)) {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_RUNNER_DRIFT_AFTER");
    }

    let envelope;
    try {
      envelope = JSON.parse(String(result.stdout || ""));
    } catch {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_OUTPUT_INVALID");
    }
    if (
      !plain(envelope) ||
      envelope.ok !== true ||
      !plain(envelope.result) ||
      envelope.error !== null
    ) {
      fail(
        "PRODUCTION_EPOCH2_RPC_OBSERVER_REVIEWED_SEMANTIC_HOLD:" +
        String(envelope?.error || "unknown"),
      );
    }
    return Object.freeze({
      ...envelope.result,
      reviewed_execution_verified: true,
      reviewed_source_head_sha: repo.head,
      reviewed_source_tree_sha: repo.tree,
      reviewed_execution_manifest_sha256: manifest.manifest_sha256,
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
function gitCommitIsAncestor(commit, descendant) {
  if (!HEX40.test(String(commit || "")) || !HEX40.test(String(descendant || ""))) {
    return false;
  }
  const result = spawnSync(
    GIT,
    [
      "--no-replace-objects",
      "-c", "core.hooksPath=/dev/null",
      "-c", "core.attributesFile=/dev/null",
      "-c", "core.fsmonitor=false",
      "-c", "core.untrackedCache=false",
      "-c", "core.preloadIndex=false",
      "-c", "submodule.recurse=false",
      "-C", ROOT,
      "merge-base", "--is-ancestor", commit, descendant,
    ],
    {
      env: gitEnv(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
  if (result.error) throw result.error;
  return result.status === 0;
}
function activationSourceLineageAncestor(plan, privateRuntimePlan, currentHead) {
  const commits = [
    privateRuntimePlan.source_head,
    plan.start_admission_observed_repo_head,
    ...plan.install_receipts.map((row) => row.installed_repo_head),
  ];
  return commits.every((commit) => gitCommitIsAncestor(commit, currentHead));
}
function readStable(file, label) {
  if (!path.isAbsolute(file) || path.resolve(file) !== file) {
    fail(label + "_PATH_INVALID");
  }
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 ||
        before.size < 2 || before.size > MAX_FILE) {
      fail(label + "_FILE_INVALID");
    }
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const n = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (n <= 0) fail(label + "_SHORT_READ");
      offset += n;
    }
    const after = fs.fstatSync(fd);
    for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"]) {
      if (before[key] !== after[key]) fail(label + "_CHANGED_DURING_READ");
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}
function parseStableJson(bytes, label) {
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail(label + "_JSON_INVALID");
  }
  if (!plain(value)) fail(label + "_JSON_NOT_OBJECT");
  return value;
}
function systemdFacts() {
  const result = spawnSync(
    SYSTEMCTL,
    [
      "--user", "show", SERVICE, "--no-pager",
      "-p", "ActiveState",
      "-p", "SubState",
      "-p", "MainPID",
      "-p", "InvocationID",
      "-p", "FragmentPath",
      "-p", "DropInPaths",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10_000 },
  );
  if (result.error || result.status !== 0) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_SYSTEMD_UNAVAILABLE");
  }
  const map = Object.create(null);
  for (const line of String(result.stdout || "").trim().split("\n")) {
    const at = line.indexOf("=");
    if (at > 0) map[line.slice(0, at)] = line.slice(at + 1);
  }
  const fragment = String(map.FragmentPath || "");
  if (!path.isAbsolute(fragment)) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_FRAGMENT_UNAVAILABLE");
  }
  const fragmentBytes = readStable(
    fragment,
    "PRODUCTION_EPOCH2_RPC_OBSERVER_FRAGMENT",
  );
  return Object.freeze({
    service_unit: SERVICE,
    active_state: String(map.ActiveState || ""),
    sub_state: String(map.SubState || ""),
    main_pid: String(map.MainPID || ""),
    invocation_id: String(map.InvocationID || "").toLowerCase(),
    fragment_path: fragment,
    fragment_file_sha256: sha256(fragmentBytes),
    drop_in_paths: String(map.DropInPaths || ""),
  });
}
function listenerPresent() {
  const result = spawnSync(
    SS,
    ["-H", "-lnt", "sport = :18553"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 5_000 },
  );
  if (result.error || result.status !== 0) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_SS_FAILED");
  }
  return String(result.stdout || "").split("\n")
    .some((line) => /\b127\.0\.0\.1:18553\b/u.test(line));
}

function normalizeDockerPortBindings(raw, code) {
  if (!plain(raw)) fail(code + "_PORT_BINDINGS_INVALID");
  const rows = [];
  for (const containerPort of Object.keys(raw).sort()) {
    const bindings = raw[containerPort];
    if (!Array.isArray(bindings) || bindings.length !== 1) {
      fail(code + "_PORT_BINDING_CARDINALITY_INVALID");
    }
    const row = bindings[0];
    if (
      !plain(row) ||
      typeof row.HostIp !== "string" ||
      typeof row.HostPort !== "string" ||
      !/^[0-9]+$/u.test(row.HostPort)
    ) {
      fail(code + "_PORT_BINDING_INVALID");
    }
    rows.push(Object.freeze({
      container_port: containerPort,
      host_ip: row.HostIp,
      host_port: row.HostPort,
    }));
  }
  return Object.freeze(rows);
}

function normalizeDockerInspect(
  inspect,
  expected,
  {
    socket_owner_uid,
    systemd_exec_start_matches_reviewed_contract,
  },
) {
  if (
    !plain(inspect) ||
    inspect.Name !== "/" + expected.container_name ||
    !plain(inspect.Config) ||
    !plain(inspect.State) ||
    !plain(inspect.HostConfig) ||
    !plain(inspect.NetworkSettings)
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_DOCKER_INSPECT_INVALID");
  }
  const configuredPorts = normalizeDockerPortBindings(
    inspect.HostConfig.PortBindings,
    "PRODUCTION_EPOCH2_RPC_OBSERVER_DOCKER_CONFIGURED",
  );
  const livePorts = normalizeDockerPortBindings(
    inspect.NetworkSettings.Ports,
    "PRODUCTION_EPOCH2_RPC_OBSERVER_DOCKER_LIVE",
  );
  const securityOptions = Array.isArray(inspect.HostConfig.SecurityOpt)
    ? inspect.HostConfig.SecurityOpt.map(String)
    : [];
  const capDrop = Array.isArray(inspect.HostConfig.CapDrop)
    ? inspect.HostConfig.CapDrop.map((value) => String(value).toUpperCase())
    : [];
  const env = Array.isArray(inspect.Config.Env)
    ? inspect.Config.Env.map(String)
    : [];
  const besuOpts = env.filter((value) => value.startsWith("BESU_OPTS="));
  const entrypoint = Array.isArray(inspect.Config.Entrypoint)
    ? inspect.Config.Entrypoint.map(String)
    : [];
  const command = Array.isArray(inspect.Config.Cmd)
    ? inspect.Config.Cmd.map(String)
    : [];
  const binds = Array.isArray(inspect.HostConfig.Binds)
    ? inspect.HostConfig.Binds.map(String).sort()
    : [];
  if (
    canonical(configuredPorts) !== canonical(expected.port_bindings) ||
    canonical(livePorts) !== canonical(expected.port_bindings) ||
    besuOpts.length !== 1 ||
    besuOpts[0] !== "BESU_OPTS=-Dbesu.plugins.dir=/plugins" ||
    !capDrop.includes("ALL") ||
    !securityOptions.some(
      (value) =>
        value === "no-new-privileges" ||
        value === "no-new-privileges:true",
    )
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_DOCKER_RUNTIME_CONTRACT_INVALID");
  }
  return Object.freeze({
    docker_host: expected.docker_host,
    container_name: expected.container_name,
    container_id: String(inspect.Id || "").toLowerCase(),
    image_reference: String(inspect.Config.Image || ""),
    image_id: String(inspect.Image || "").toLowerCase(),
    running:
      inspect.State.Running === true &&
      String(inspect.State.Status || "") === "running",
    started_at_utc: String(inspect.State.StartedAt || ""),
    auto_remove: inspect.HostConfig.AutoRemove === true,
    user: String(inspect.Config.User || ""),
    entrypoint: Object.freeze(entrypoint),
    command: Object.freeze(command),
    binds: Object.freeze(binds),
    port_bindings: configuredPorts,
    besu_plugins_env_verified: true,
    cap_drop_all: true,
    no_new_privileges: true,
    rootless_security_verified: true,
    docker_socket_owner_uid: String(socket_owner_uid),
    systemd_exec_start_matches_reviewed_contract:
      systemd_exec_start_matches_reviewed_contract === true,
  });
}

export function testOnlyNormalizeVoidProductionEpoch2RpcDockerInspectV1(
  inspect,
  expected,
  socketOwnerUid,
) {
  return normalizeDockerInspect(inspect, expected, {
    socket_owner_uid: String(socketOwnerUid),
    systemd_exec_start_matches_reviewed_contract: true,
  });
}

function validateDockerDaemonInfo(info) {
  const securityOptions = Array.isArray(info?.SecurityOptions)
    ? info.SecurityOptions.map(String)
    : [];
  if (
    !plain(info) ||
    !securityOptions.some((value) =>
      value.toLowerCase().includes("rootless")
    )
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_DOCKER_DAEMON_NOT_ROOTLESS");
  }
  return true;
}

export function testOnlyValidateVoidProductionEpoch2RpcDockerDaemonInfoV1(
  info,
) {
  return validateDockerDaemonInfo(info);
}

function dockerGetJson(socketPath, requestPath) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        socketPath,
        path: requestPath,
        method: "GET",
        headers: { host: "docker" },
      },
      (response) => {
        const chunks = [];
        let total = 0;
        response.on("data", (chunk) => {
          total += chunk.length;
          if (total > MAX_DOCKER_RESPONSE) {
            request.destroy(new Error("docker_response_above_bound"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                "docker_http_status_" + String(response.statusCode || 0),
              ),
            );
            return;
          }
          try {
            const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (!plain(value)) {
              reject(new Error("docker_json_object_required"));
              return;
            }
            resolve(value);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.setTimeout(
      5_000,
      () => request.destroy(new Error("docker_timeout")),
    );
    request.on("error", reject);
    request.end();
  });
}

async function dockerContainerFacts(expected, service, precisionInstall) {
  const prefix = "unix://";
  if (
    !expected.docker_host.startsWith(prefix) ||
    service.service_unit !== SERVICE ||
    service.active_state !== "active" ||
    service.sub_state !== "running" ||
    service.fragment_path !== precisionInstall.unit_install_path ||
    service.fragment_file_sha256 !== precisionInstall.systemd_unit_sha256
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_SERVICE_CONTAINER_BINDING_INVALID");
  }
  const socketPath = expected.docker_host.slice(prefix.length);
  const expectedSocket =
    "/run/user/" + String(process.getuid()) + "/docker.sock";
  if (
    socketPath !== expectedSocket ||
    !path.isAbsolute(socketPath) ||
    path.resolve(socketPath) !== socketPath
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_DOCKER_SOCKET_PATH_INVALID");
  }
  const before = fs.lstatSync(socketPath);
  if (
    !before.isSocket() ||
    (
      typeof process.getuid === "function" &&
      before.uid !== process.getuid()
    )
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_DOCKER_SOCKET_IDENTITY_INVALID");
  }
  const daemonInfo = await dockerGetJson(socketPath, "/info");
  validateDockerDaemonInfo(daemonInfo);
  const inspect = await dockerGetJson(
    socketPath,
    "/containers/" + encodeURIComponent(expected.container_name) + "/json",
  );
  const after = fs.lstatSync(socketPath);
  if (
    !after.isSocket() ||
    after.dev !== before.dev ||
    after.ino !== before.ino ||
    after.uid !== before.uid
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_DOCKER_SOCKET_CHANGED");
  }
  return normalizeDockerInspect(inspect, expected, {
    socket_owner_uid: before.uid,
    systemd_exec_start_matches_reviewed_contract: true,
  });
}
function rpcCall(method, params = []) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify({
      jsonrpc: "2.0", id: 1, method, params,
    }), "utf8");
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: 18553,
        path: "/",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(body.length),
        },
      },
      (response) => {
        const chunks = [];
        let total = 0;
        response.on("data", (chunk) => {
          total += chunk.length;
          if (total > MAX_RPC) {
            request.destroy(new Error("rpc_response_above_bound"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          if (response.statusCode !== 200) {
            reject(new Error("rpc_http_status_" + String(response.statusCode)));
            return;
          }
          try {
            const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (!plain(value) || value.error || !Object.hasOwn(value, "result")) {
              reject(new Error("rpc_result_invalid:" + method));
              return;
            }
            resolve(value.result);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.setTimeout(
      5_000,
      () => request.destroy(new Error("rpc_timeout:" + method)),
    );
    request.on("error", reject);
    request.end(body);
  });
}
async function liveRpcFacts() {
  const chain = String(await rpcCall("eth_chainId", [])).toLowerCase();
  const headHex = String(await rpcCall("eth_blockNumber", [])).toLowerCase();
  const peerHex = String(await rpcCall("net_peerCount", [])).toLowerCase();
  const validators =
    await rpcCall("qbft_getValidatorsByBlockNumber", [headHex]);
  const genesis = await rpcCall("eth_getBlockByNumber", ["0x0", false]);
  const head = await rpcCall("eth_getBlockByNumber", [headHex, false]);
  if (!plain(genesis) || !plain(head) || !Array.isArray(validators)) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_RPC_SHAPE_INVALID");
  }
  return Object.freeze({
    url: RPC_URL,
    chain_id_hex: chain,
    chain_id: Number(quantity(chain, "PRODUCTION_EPOCH2_RPC_OBSERVER_CHAIN_INVALID")),
    execution_epoch: 2,
    genesis_block_number: String(
      quantity(genesis.number, "PRODUCTION_EPOCH2_RPC_OBSERVER_GENESIS_NUMBER_INVALID"),
    ),
    genesis_block_hash: String(genesis.hash || "").toLowerCase(),
    genesis_state_root: String(genesis.stateRoot || "").toLowerCase(),
    head_block_number: String(
      quantity(head.number, "PRODUCTION_EPOCH2_RPC_OBSERVER_HEAD_NUMBER_INVALID"),
    ),
    head_block_hash: String(head.hash || "").toLowerCase(),
    head_state_root: String(head.stateRoot || "").toLowerCase(),
    peer_count: Number(
      quantity(peerHex, "PRODUCTION_EPOCH2_RPC_OBSERVER_PEER_COUNT_INVALID"),
    ),
    validators,
  });
}
function sameDirectoryIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.mode === right.mode
  );
}
function outsideRepository(file) {
  const relative = path.relative(ROOT, file);
  return (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  );
}
export function createPrivateOutputBoundV1(
  file,
  value,
  { testOnlyAfterParentRevalidationBeforeCreate = null } = {},
) {
  if (
    process.platform !== "linux" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    !outsideRepository(file)
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_PATH_INVALID");
  }
  const parent = path.dirname(file);
  const basename = path.basename(file);
  if (
    basename === "" ||
    basename === "." ||
    basename === ".." ||
    basename.includes("/") ||
    basename.includes("\\")
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_BASENAME_INVALID");
  }
  if (fs.realpathSync.native(parent) !== parent) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_PARENT_ALIAS");
  }
  const parentPathStat = fs.lstatSync(parent);
  if (
    !parentPathStat.isDirectory() ||
    parentPathStat.isSymbolicLink() ||
    (parentPathStat.mode & 0o022) !== 0 ||
    (
      typeof process.getuid === "function" &&
      parentPathStat.uid !== process.getuid()
    )
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_PARENT_UNSAFE");
  }

  const bytes = pretty(value);
  let parentFd;
  let fileFd;
  let procFile;
  let created = false;
  try {
    parentFd = fs.openSync(
      parent,
      fs.constants.O_RDONLY |
        Number(fs.constants.O_DIRECTORY || 0) |
        Number(fs.constants.O_NOFOLLOW || 0),
    );
    const parentFdStat = fs.fstatSync(parentFd);
    if (
      !sameDirectoryIdentity(parentFdStat, parentPathStat) ||
      (parentFdStat.mode & 0o022) !== 0 ||
      (
        typeof process.getuid === "function" &&
        parentFdStat.uid !== process.getuid()
      )
    ) {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_PARENT_DESCRIPTOR_MISMATCH");
    }
    const parentBefore = fs.lstatSync(parent);
    if (!sameDirectoryIdentity(parentBefore, parentFdStat)) {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_PARENT_CHANGED_BEFORE_CREATE");
    }
    if (testOnlyAfterParentRevalidationBeforeCreate !== null) {
      if (typeof testOnlyAfterParentRevalidationBeforeCreate !== "function") {
        fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_TEST_HOOK_INVALID");
      }
      testOnlyAfterParentRevalidationBeforeCreate();
    }

    procFile = path.join("/proc/self/fd/" + String(parentFd), basename);
    fileFd = fs.openSync(
      procFile,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        Number(fs.constants.O_NOFOLLOW || 0),
      0o600,
    );
    created = true;
    fs.writeFileSync(fileFd, bytes);
    fs.fchmodSync(fileFd, 0o600);
    fs.fsyncSync(fileFd);
    const createdStat = fs.fstatSync(fileFd);
    if (
      !createdStat.isFile() ||
      createdStat.nlink !== 1 ||
      createdStat.size !== bytes.length ||
      (createdStat.mode & 0o077) !== 0 ||
      (
        typeof process.getuid === "function" &&
        createdStat.uid !== process.getuid()
      )
    ) {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_FILE_IDENTITY_INVALID");
    }
    fs.fsyncSync(parentFd);

    let parentAfter = null;
    let outputAfter = null;
    try {
      parentAfter = fs.lstatSync(parent);
      outputAfter = fs.lstatSync(file);
    } catch (error) {
      parentAfter = null;
      outputAfter = null;
      void error;
    }
    if (
      !parentAfter ||
      !sameDirectoryIdentity(parentAfter, parentFdStat) ||
      !outputAfter ||
      !outputAfter.isFile() ||
      outputAfter.isSymbolicLink() ||
      outputAfter.dev !== createdStat.dev ||
      outputAfter.ino !== createdStat.ino ||
      outputAfter.nlink !== 1 ||
      outputAfter.size !== createdStat.size
    ) {
      const primary = new Error(
        "PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_PARENT_CHANGED_DURING_WRITE",
      );
      let cleanup = null;
      try {
        if (created && procFile && fs.existsSync(procFile)) {
          fs.unlinkSync(procFile);
          fs.fsyncSync(parentFd);
          created = false;
        }
      } catch (error) {
        cleanup = error;
      }
      if (cleanup) {
        throw new AggregateError(
          [primary, cleanup],
          "PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_DRIFT_CLEANUP_FAILED",
        );
      }
      throw primary;
    }
    return Object.freeze({ sha256: sha256(bytes), bytes: bytes.length });
  } finally {
    if (fileFd !== undefined) fs.closeSync(fileFd);
    if (parentFd !== undefined) fs.closeSync(parentFd);
  }
}
export function testOnlyExerciseVoidProductionEpoch2RpcOutputParentReplacementV1() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-production-rpc-observer-output-race-"),
  );
  fs.chmodSync(root, 0o700);
  const parent = path.join(root, "output");
  const replacement = path.join(root, "replacement");
  const moved = path.join(root, "moved-original");
  const file = path.join(parent, "observation.json");
  fs.mkdirSync(parent, { mode: 0o700 });
  fs.mkdirSync(replacement, { mode: 0o700 });
  let reason = null;
  try {
    try {
      createPrivateOutputBoundV1(
        file,
        { marker: "VOID_PRODUCTION_EPOCH2_RPC_OUTPUT_PARENT_RACE_TEST_ONLY" },
        {
          testOnlyAfterParentRevalidationBeforeCreate() {
            fs.renameSync(parent, moved);
            fs.renameSync(replacement, parent);
          },
        },
      );
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
    return Object.freeze({
      reason,
      replacement_output_exists:
        fs.existsSync(path.join(parent, "observation.json")),
      original_output_exists:
        fs.existsSync(path.join(moved, "observation.json")),
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      "private-runtime-plan": { type: "string" },
      "private-runtime-plan-sha256": { type: "string" },
      "bundle-set": { type: "string" },
      "bundle-set-sha256": { type: "string" },
      "install-precision": { type: "string" },
      "install-precision-sha256": { type: "string" },
      "install-nimo": { type: "string" },
      "install-nimo-sha256": { type: "string" },
      "install-xiphos": { type: "string" },
      "install-xiphos-sha256": { type: "string" },
      "start-admission": { type: "string" },
      "start-admission-sha256": { type: "string" },
      "activation-plan": { type: "string" },
      "activation-plan-sha256": { type: "string" },
      "activation-receipt": { type: "string" },
      "activation-receipt-sha256": { type: "string" },
      output: { type: "string" },
    },
    allowPositionals: false,
    strict: true,
  });
  for (const key of [
    "private-runtime-plan",
    "private-runtime-plan-sha256",
    "bundle-set",
    "bundle-set-sha256",
    "install-precision",
    "install-precision-sha256",
    "install-nimo",
    "install-nimo-sha256",
    "install-xiphos",
    "install-xiphos-sha256",
    "start-admission",
    "start-admission-sha256",
    "activation-plan",
    "activation-plan-sha256",
    "activation-receipt",
    "activation-receipt-sha256",
    "output",
  ]) {
    if (!values[key]) fail("PRODUCTION_EPOCH2_RPC_OBSERVER_ARGUMENT_MISSING:" + key);
  }
  for (const key of [
    "private-runtime-plan-sha256",
    "bundle-set-sha256",
    "install-precision-sha256",
    "install-nimo-sha256",
    "install-xiphos-sha256",
    "start-admission-sha256",
    "activation-plan-sha256",
    "activation-receipt-sha256",
  ]) {
    if (!HEX64.test(values[key])) {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_ARGUMENT_SHA_INVALID:" + key);
    }
  }

  const source = repoIdentity();
  const privatePlanBytes = readStable(
    path.resolve(values["private-runtime-plan"]),
    "PRODUCTION_EPOCH2_RPC_OBSERVER_PRIVATE_PLAN_FILE",
  );
  const bundleSetBytes = readStable(
    path.resolve(values["bundle-set"]),
    "PRODUCTION_EPOCH2_RPC_OBSERVER_BUNDLE_SET_FILE",
  );
  const installPrecisionBytes = readStable(
    path.resolve(values["install-precision"]),
    "PRODUCTION_EPOCH2_RPC_OBSERVER_INSTALL_PRECISION_FILE",
  );
  const installNimoBytes = readStable(
    path.resolve(values["install-nimo"]),
    "PRODUCTION_EPOCH2_RPC_OBSERVER_INSTALL_NIMO_FILE",
  );
  const installXiphosBytes = readStable(
    path.resolve(values["install-xiphos"]),
    "PRODUCTION_EPOCH2_RPC_OBSERVER_INSTALL_XIPHOS_FILE",
  );
  const startAdmissionBytes = readStable(
    path.resolve(values["start-admission"]),
    "PRODUCTION_EPOCH2_RPC_OBSERVER_START_ADMISSION_FILE",
  );
  const planBytes = readStable(
    path.resolve(values["activation-plan"]),
    "PRODUCTION_EPOCH2_RPC_OBSERVER_PLAN_FILE",
  );
  const receiptBytes = readStable(
    path.resolve(values["activation-receipt"]),
    "PRODUCTION_EPOCH2_RPC_OBSERVER_RECEIPT_FILE",
  );
  const externalArtifacts = [
    [privatePlanBytes, "private-runtime-plan-sha256"],
    [bundleSetBytes, "bundle-set-sha256"],
    [installPrecisionBytes, "install-precision-sha256"],
    [installNimoBytes, "install-nimo-sha256"],
    [installXiphosBytes, "install-xiphos-sha256"],
    [startAdmissionBytes, "start-admission-sha256"],
    [planBytes, "activation-plan-sha256"],
    [receiptBytes, "activation-receipt-sha256"],
  ];
  for (const [artifactBytes, key] of externalArtifacts) {
    if (sha256(artifactBytes) !== values[key]) {
      fail("PRODUCTION_EPOCH2_RPC_OBSERVER_EXTERNAL_SHA_MISMATCH:" + key);
    }
  }

  const privateRuntimePlan = parseStableJson(
    privatePlanBytes,
    "PRODUCTION_EPOCH2_RPC_OBSERVER_PRIVATE_PLAN",
  );
  const bundleSet = parseStableJson(
    bundleSetBytes,
    "PRODUCTION_EPOCH2_RPC_OBSERVER_BUNDLE_SET",
  );
  const installReceipts = {
    precision: parseStableJson(
      installPrecisionBytes,
      "PRODUCTION_EPOCH2_RPC_OBSERVER_INSTALL_PRECISION",
    ),
    nimo: parseStableJson(
      installNimoBytes,
      "PRODUCTION_EPOCH2_RPC_OBSERVER_INSTALL_NIMO",
    ),
    xiphos: parseStableJson(
      installXiphosBytes,
      "PRODUCTION_EPOCH2_RPC_OBSERVER_INSTALL_XIPHOS",
    ),
  };
  const startAdmission = parseStableJson(
    startAdmissionBytes,
    "PRODUCTION_EPOCH2_RPC_OBSERVER_START_ADMISSION",
  );
  const parsedPlan = parseBytes(
    planBytes,
    values["activation-plan-sha256"],
    "PRODUCTION_EPOCH2_RPC_OBSERVER_CLI_PLAN",
  ).value;
  const parsedReceipt = parseBytes(
    receiptBytes,
    values["activation-receipt-sha256"],
    "PRODUCTION_EPOCH2_RPC_OBSERVER_CLI_RECEIPT",
  ).value;

  const rederivedPlan =
    compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1({
      plan: privateRuntimePlan,
      plan_file_sha256: values["private-runtime-plan-sha256"],
      bundle_set_receipt: bundleSet,
      install_receipts: installReceipts,
      start_admission_receipt: startAdmission,
      compiled_at_utc: parsedPlan.compiled_at_utc,
    });
  if (!same(rederivedPlan, parsedPlan)) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_ACTIVATION_PLAN_REDERIVATION_MISMATCH");
  }

  const reviewedSemantic = reviewedSemanticExecution(source, {
    private_runtime_plan: privateRuntimePlan,
    private_runtime_plan_file_sha256: values["private-runtime-plan-sha256"],
    bundle_set: bundleSet,
    install_receipts: installReceipts,
    start_admission: startAdmission,
    activation_plan: parsedPlan,
    activation_receipt: parsedReceipt,
    rpc_url: RPC_URL,
  });

  const sourceLineageAncestor =
    activationSourceLineageAncestor(
      parsedPlan,
      privateRuntimePlan,
      source.head,
    );
  if (!sourceLineageAncestor) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_ACTIVATION_SOURCE_NOT_ANCESTOR");
  }
  const precisionInstall =
    parsedPlan.install_receipts.find((row) => row?.role === "precision");
  if (!plain(precisionInstall)) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_PRECISION_INSTALL_MISSING");
  }
  const expectedContainer =
    reviewedPrecisionContainerContract(reviewedSemantic, parsedPlan);
  const service = systemdFacts();
  const containerBefore =
    await dockerContainerFacts(expectedContainer, service, precisionInstall);
  const listenerBefore = listenerPresent();
  const rpc = await liveRpcFacts();
  const serviceAfter = systemdFacts();
  const containerAfter =
    await dockerContainerFacts(expectedContainer, serviceAfter, precisionInstall);
  const listenerAfter = listenerPresent();
  const sourceAfter = repoIdentity();
  if (
    canonical(serviceAfter) !== canonical(service) ||
    canonical(containerAfter) !== canonical(containerBefore) ||
    listenerBefore !== true ||
    listenerAfter !== true ||
    canonical(sourceAfter) !== canonical(source)
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OBSERVATION_GENERATION_MOVED");
  }
  const observation = buildVoidProductionEpoch2RpcHostObservationV1({
    activation_plan_bytes: planBytes,
    activation_plan_file_sha256: values["activation-plan-sha256"],
    activation_receipt_bytes: receiptBytes,
    activation_receipt_file_sha256: values["activation-receipt-sha256"],
    source_binding: source,
    reviewed_semantic: reviewedSemantic,
    host_observation: {
      hostname: os.hostname(),
      ...service,
      listener_address: "127.0.0.1",
      listener_port: 18553,
      listener_present: listenerBefore,
      canonical_main_stable_during_observation: true,
      service_invocation_stable_during_observation: true,
      listener_stable_during_observation: true,
      container_stable_during_observation: true,
      service_container_contract_verified: true,
      container: containerBefore,
      activation_source_lineage_ancestor_current_main: sourceLineageAncestor,
      activation_plan_rederived_from_upstream: true,
      activation_upstream: {
        private_runtime_plan_file_sha256:
          values["private-runtime-plan-sha256"],
        bundle_set_receipt_file_sha256: values["bundle-set-sha256"],
        start_admission_receipt_file_sha256:
          values["start-admission-sha256"],
        install_precision_file_sha256: values["install-precision-sha256"],
        install_nimo_file_sha256: values["install-nimo-sha256"],
        install_xiphos_file_sha256: values["install-xiphos-sha256"],
      },
      rpc,
      observed_at_utc: new Date().toISOString(),
    },
  });
  const output = path.resolve(values.output);
  const written = createPrivateOutputBoundV1(output, observation);
  console.log(VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1);
  console.log("status=" + observation.status);
  console.log("observation_id=" + observation.observation_id);
  console.log("observation_sha256=" + written.sha256);
  console.log("rpc_url=" + observation.rpc.url);
  console.log("container_id=" + observation.container.container_id);
  console.log("container_image_id=" + observation.container.image_id);
  console.log("service_container_listener_binding_verified=true");
  console.log("head_block_number=" + observation.rpc.head_block_number);
  console.log("peer_count=" + String(observation.rpc.peer_count));
  console.log("independent_host_acceptance=true");
  console.log("target_descriptor_promotion_authorized=false");
  console.log("transaction_broadcast=false");
  console.log("funds_movement=false");
  console.log("output=" + output);
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error("VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  });
}
