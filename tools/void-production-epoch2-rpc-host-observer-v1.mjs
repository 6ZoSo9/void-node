#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  EXPECTED_VALIDATORS_V1,
  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
} from "./void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";
import {
  HOLD_STATUS,
  loadProductionEpoch2RpcTargetV1,
  productionEpoch2RpcUrlFingerprintV1,
} from "./void-production-epoch2-rpc-target-v1.mjs";

export const VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1 =
  "VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1";

export const VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_AUTHORITY_V1 =
  Object.freeze({
    observer_read_only: true,
    canonical_main_live_read: true,
    activation_lineage_rederived: true,
    systemd_read_only: true,
    listener_read_only: true,
    rpc_read_only: true,
    service_action: false,
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
    target_descriptor_promotion: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL_REL = "tools/void-production-epoch2-rpc-host-observer-v1.mjs";
const GIT = "/usr/bin/git";
const SYSTEMCTL = "/usr/bin/systemctl";
const SS = "/usr/bin/ss";
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
function rebuildReceipt(plan, receipt) {
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(plan);
  if (
    !plain(receipt) ||
    receipt.marker !==
      "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_RECEIPT_V1" ||
    receipt.status !==
      "PRIVATE_QBFT_RUNTIME_ACTIVE_TRANSACTION_AND_MIGRATION_HOLD"
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_ACTIVATION_RECEIPT_INVALID");
  }
  const o = receipt.observations;
  const rebuilt = buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({
    activation_plan: plan,
    activated_at_utc: receipt.activated_at_utc,
    observed: {
      validators: receipt.validators,
      precision_only_block_number: o?.precision_only_block_number,
      after_nimo_block_number: o?.after_nimo_block_number,
      after_nimo_peer_count: o?.after_nimo_peer_count,
      after_xiphos_block_number: o?.after_xiphos_block_number,
      after_xiphos_peer_count: o?.after_xiphos_peer_count,
      chain_id_hex: receipt.chain_id_hex,
      started_roles: receipt.started_roles,
    },
  });
  if (!same(rebuilt, receipt)) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_ACTIVATION_RECEIPT_REBUILD_MISMATCH");
  }
  return rebuilt;
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
  const plan =
    validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(p.value);
  const receipt = rebuildReceipt(plan, r.value);

  const target = loadProductionEpoch2RpcTargetV1();
  const identity = target.value.reviewed_successor_identity;
  if (
    target.evaluation.status !== HOLD_STATUS ||
    target.evaluation.production_rpc_target_selected !== false ||
    identity?.prospective_production_rpc_url !== RPC_URL ||
    identity?.prospective_production_service_unit !== SERVICE
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_TARGET_DESCRIPTOR_INVALID");
  }

  const source = input.source_binding;
  const host = input.host_observation;
  if (!validSource(source) || !plain(host)) {
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
    host.listener_stable_during_observation !== true
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
      JSON.stringify([...EXPECTED_VALIDATORS_V1].sort())
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
      status: target.evaluation.status,
      production_rpc_target_selected: false,
      prospective_rpc_url: RPC_URL,
      rpc_url_fingerprint_sha256:
        productionEpoch2RpcUrlFingerprintV1(RPC_URL),
      prospective_service_unit: SERVICE,
      production_validator_binding_evidence_path:
        identity.production_validator_binding_evidence_path,
      production_validator_binding_evidence_sha256:
        identity.production_validator_binding_evidence_sha256,
      production_validator_binding_evidence_id:
        identity.production_validator_binding_evidence_id,
    }),
    activation_lineage: Object.freeze({
      activation_plan_id: plan.activation_plan_id,
      activation_plan_file_sha256: p.sha256,
      activation_receipt_id: receipt.activation_receipt_id,
      activation_receipt_file_sha256: r.sha256,
      activated_at_utc: receipt.activated_at_utc,
      activation_receipt_rederived: true,
      activation_floor_block_number:
        receipt.observations.after_xiphos_block_number,
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
    }),
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
function createPrivateOutput(file, value) {
  if (!path.isAbsolute(file) || path.resolve(file) !== file) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_PATH_INVALID");
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent || fs.existsSync(file)) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_OUTPUT_CUSTODY_INVALID");
  }
  const bytes = pretty(value);
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  const dfd = fs.openSync(parent, fs.constants.O_RDONLY);
  try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
  return Object.freeze({ sha256: sha256(bytes), bytes: bytes.length });
}

async function main() {
  const { values } = parseArgs({
    options: {
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
    "activation-plan",
    "activation-plan-sha256",
    "activation-receipt",
    "activation-receipt-sha256",
    "output",
  ]) {
    if (!values[key]) fail("PRODUCTION_EPOCH2_RPC_OBSERVER_ARGUMENT_MISSING:" + key);
  }
  if (
    !HEX64.test(values["activation-plan-sha256"]) ||
    !HEX64.test(values["activation-receipt-sha256"])
  ) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_ARGUMENT_SHA_INVALID");
  }

  const source = repoIdentity();
  const planBytes = readStable(
    path.resolve(values["activation-plan"]),
    "PRODUCTION_EPOCH2_RPC_OBSERVER_PLAN_FILE",
  );
  const receiptBytes = readStable(
    path.resolve(values["activation-receipt"]),
    "PRODUCTION_EPOCH2_RPC_OBSERVER_RECEIPT_FILE",
  );
  if (sha256(planBytes) !== values["activation-plan-sha256"] ||
      sha256(receiptBytes) !== values["activation-receipt-sha256"]) {
    fail("PRODUCTION_EPOCH2_RPC_OBSERVER_EXTERNAL_SHA_MISMATCH");
  }
  const service = systemdFacts();
  const listenerBefore = listenerPresent();
  const rpc = await liveRpcFacts();
  const serviceAfter = systemdFacts();
  const listenerAfter = listenerPresent();
  const sourceAfter = repoIdentity();
  if (
    canonical(serviceAfter) !== canonical(service) ||
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
    host_observation: {
      hostname: os.hostname(),
      ...service,
      listener_address: "127.0.0.1",
      listener_port: 18553,
      listener_present: listenerBefore,
      canonical_main_stable_during_observation: true,
      service_invocation_stable_during_observation: true,
      listener_stable_during_observation: true,
      rpc,
      observed_at_utc: new Date().toISOString(),
    },
  });
  const output = path.resolve(values.output);
  const written = createPrivateOutput(output, observation);
  console.log(VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1);
  console.log("status=" + observation.status);
  console.log("observation_id=" + observation.observation_id);
  console.log("observation_sha256=" + written.sha256);
  console.log("rpc_url=" + observation.rpc.url);
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
