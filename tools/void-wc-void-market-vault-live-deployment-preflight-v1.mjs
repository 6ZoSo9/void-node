#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_V1 =
  "VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_V1";

export const VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_AUTHORITY_V1 =
  Object.freeze({
    live_observation_only: true,
    exact_current_qualification_required: true,
    qualification_content_id_rederived: true,
    qualification_reexecution_performed: false,
    private_qualification_input_descriptor_bound: true,
    loopback_rpc_required: true,
    rpc_redirect_forbidden: true,
    read_only_rpc: true,
    operator_selected_public_deployer: true,
    operator_selected_public_inventory_source: true,
    stable_pending_nonce_required: true,
    coherent_block_observation_required: true,
    block_bound_deployment_gas_estimate_required: true,
    bare_deployment_cost_observation: true,
    inventory_balance_observation: true,

    credential_content_access: false,
    private_key_access: false,
    wallet_or_signer_access: false,
    transaction_envelope_construction: false,
    gas_limit_policy_selection: false,
    fee_policy_selection: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_write: false,
    deployment: false,
    inventory_funding: false,
    token_transfer: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANONICAL_REMOTE = "https://github.com/6ZoSo9/void-node.git";
const CHAIN_ID = 2050n;
const VOID_TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const COUPLED_LAUNCH_ID =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const COMPILED_IDENTITY_ID =
  "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a";
const REVIEWED_RUNTIME_PROFILE_ID =
  "voidrnpr1_bb76a6a16b4fb779edffb4f541f7a91d0ddb00bfe404031b4387840e74001e77";
const REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256 =
  "5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73";
const OPENING_INVENTORY_ATOMS = 10000000000000000000000000n;
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const DATA = /^0x(?:[0-9a-f]{2})+$/u;
const QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/u;
const HASH32 = /^0x[0-9a-f]{64}$/u;
const QUALIFICATION_ID = /^voidwcvrdq1_[0-9a-f]{64}$/u;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_RPC_BODY_BYTES = 4 * 1024 * 1024;

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (plain(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("market_vault_live_preflight_canonical_value_invalid");
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalAddress(value, code) {
  const text = String(value || "").toLowerCase();
  if (
    !ADDRESS.test(text) ||
    text === "0x0000000000000000000000000000000000000000"
  ) {
    fail(code);
  }
  return text;
}

function quantity(value, code) {
  const text = String(value || "").toLowerCase();
  if (!QUANTITY.test(text)) fail(code);
  return BigInt(text);
}

function hexData(value, code) {
  const text = String(value || "").toLowerCase();
  if (!DATA.test(text)) fail(code);
  return text;
}

function unixValue(value, code) {
  try {
    const parsed = BigInt(String(value));
    if (parsed < 0n || parsed > (1n << 64n) - 1n) fail(code);
    return parsed;
  } catch {
    fail(code);
  }
}

function expectedQualificationId(value) {
  const copy = structuredClone(value);
  delete copy.qualification_id;
  return "voidwcvrdq1_" + sha256(Buffer.from(canonicalJson(copy), "utf8"));
}

function validateQualification(qualification, sourceIdentity, nowUnix) {
  if (!plain(qualification)) fail("market_vault_live_preflight_qualification_invalid");
  if (
    qualification.marker !==
      "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1" ||
    qualification.version !== 1 ||
    qualification.status !==
      "QUALIFIED_DEPLOYMENT_PREPARATION_READY_NOT_AUTHORIZED" ||
    qualification.chain_id !== 2050 ||
    qualification.execution_epoch !== 2 ||
    qualification.coupled_launch_id !== COUPLED_LAUNCH_ID ||
    !QUALIFICATION_ID.test(String(qualification.qualification_id || "")) ||
    qualification.qualification_id !== expectedQualificationId(qualification)
  ) {
    fail("market_vault_live_preflight_qualification_identity_invalid");
  }

  const source = qualification.source_binding;
  if (
    !plain(source) ||
    source.source_head_sha !== sourceIdentity.head ||
    source.source_tree_sha !== sourceIdentity.tree ||
    source.canonical_remote_url !== CANONICAL_REMOTE
  ) {
    fail("market_vault_live_preflight_qualification_source_generation_mismatch");
  }

  const launch = qualification.launch_controller;
  if (
    !plain(launch) ||
    launch.control_verified !== true ||
    launch.role_binding_authorized !== false ||
    !canonicalAddress(
      launch.address,
      "market_vault_live_preflight_launch_controller_invalid",
    )
  ) {
    fail("market_vault_live_preflight_launch_controller_invalid");
  }
  if (
    qualification.role_separation?.all_addresses_nonzero !== true ||
    qualification.role_separation?.all_addresses_distinct !== true ||
    qualification.role_separation?.void_token_distinct_from_all_roles !== true ||
    qualification.vault_identity?.canonical_void_token !== VOID_TOKEN ||
    qualification.vault_identity?.accepted_compiled_identity_id !==
      COMPILED_IDENTITY_ID ||
    qualification.reviewed_package_runtime?.profile_id !==
      REVIEWED_RUNTIME_PROFILE_ID ||
    qualification.reviewed_package_runtime?.packages_aggregate_sha256 !==
      REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256 ||
    qualification.reviewed_package_runtime?.reviewed_package_bytes_verified !==
      true ||
    qualification.reviewed_package_runtime
      ?.ancestor_package_resolution_preempted !== true ||
    qualification.reviewed_package_runtime
      ?.execution_network_isolation_provided !== false
  ) {
    fail("market_vault_live_preflight_qualification_binding_invalid");
  }

  const validUntil = unixValue(
    launch.valid_until_unix,
    "market_vault_live_preflight_qualification_expiry_invalid",
  );
  const reverifiedAt = unixValue(
    launch.reverified_at_unix,
    "market_vault_live_preflight_qualification_time_invalid",
  );
  if (nowUnix < reverifiedAt || nowUnix > validUntil) {
    fail("market_vault_live_preflight_qualification_not_current");
  }

  const prep = qualification.deployment_preparation;
  if (
    !plain(prep) ||
    prep.exact_creation_payload_ready !== true ||
    prep.deployer_selected !== false ||
    prep.nonce_observed !== false ||
    prep.fee_observed !== false ||
    prep.transaction_envelope_ready !== false ||
    prep.deployment_authorized !== false ||
    prep.inventory_funding_authorized !== false
  ) {
    fail("market_vault_live_preflight_deployment_preparation_invalid");
  }

  const deploymentData = hexData(
    prep.deployment_data_hex,
    "market_vault_live_preflight_deployment_data_invalid",
  );
  const deploymentBytes = Buffer.from(deploymentData.slice(2), "hex");
  if (
    deploymentBytes.length !== prep.deployment_data_bytes ||
    sha256(deploymentBytes) !== prep.deployment_data_sha256
  ) {
    fail("market_vault_live_preflight_deployment_data_identity_mismatch");
  }

  if (
    qualification.next_gate !==
      "separately_authorized_exact_market_vault_deployment_and_inventory_lock" ||
    qualification.authority?.deployment !== false ||
    qualification.authority?.inventory_funding !== false ||
    qualification.authority?.transaction_signing !== false ||
    qualification.authority?.transaction_broadcast !== false ||
    qualification.authority?.funds_movement !== false
  ) {
    fail("market_vault_live_preflight_qualification_authority_invalid");
  }

  return Object.freeze({
    deploymentData,
    deploymentDataSha256: prep.deployment_data_sha256,
    qualificationId: qualification.qualification_id,
    launchController: launch.address.toLowerCase(),
    validUntilUnix: validUntil.toString(),
  });
}

function gitEnv() {
  return {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
}

function git(args, code, { allowEmpty = false } = {}) {
  const result = spawnSync(
    "/usr/bin/git",
    [
      "--no-replace-objects",
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "core.attributesFile=/dev/null",
      "-c",
      "core.untrackedCache=false",
      "-c",
      "core.preloadIndex=false",
      "-c",
      "submodule.recurse=false",
      "-C",
      ROOT,
      ...args,
    ],
    {
      env: gitEnv(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0) fail(code);
  const text = String(result.stdout || "").trim();
  if (!allowEmpty && !text) fail(code);
  return text;
}

export function currentVoidWcVoidMarketVaultLivePreflightSourceV1() {
  const status = git(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "market_vault_live_preflight_git_status_unavailable",
    { allowEmpty: true },
  );
  if (status !== "") fail("market_vault_live_preflight_repository_not_clean");
  const head = git(
    ["rev-parse", "HEAD"],
    "market_vault_live_preflight_head_unavailable",
  );
  const tree = git(
    ["rev-parse", "HEAD^{tree}"],
    "market_vault_live_preflight_tree_unavailable",
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("market_vault_live_preflight_git_identity_invalid");
  }
  const origin = git(
    ["config", "--local", "--no-includes", "--get", "remote.origin.url"],
    "market_vault_live_preflight_origin_unavailable",
  );
  const accepted = new Set([
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ]);
  if (!accepted.has(origin)) {
    fail("market_vault_live_preflight_canonical_origin_required");
  }
  return Object.freeze({
    head,
    tree,
    canonical_remote_url: CANONICAL_REMOTE,
  });
}

function blockIdentity(value, code) {
  if (
    !plain(value) ||
    !QUANTITY.test(String(value.number || "").toLowerCase()) ||
    !HASH32.test(String(value.hash || "").toLowerCase()) ||
    !HASH32.test(String(value.stateRoot || "").toLowerCase())
  ) {
    fail(code);
  }
  return Object.freeze({
    number: String(value.number).toLowerCase(),
    hash: String(value.hash).toLowerCase(),
    state_root: String(value.stateRoot).toLowerCase(),
  });
}

function balanceOfData(address) {
  return "0x70a08231" + address.slice(2).padStart(64, "0");
}

export async function collectVoidWcVoidMarketVaultLiveDeploymentObservationsV1({
  rpc,
  qualification,
  qualificationFileSha256,
  sourceIdentity,
  deployerAddress,
  inventorySourceAddress,
  nowUnix,
}) {
  if (typeof rpc !== "function") {
    fail("market_vault_live_preflight_rpc_required");
  }
  const now = unixValue(nowUnix, "market_vault_live_preflight_now_invalid");
  if (
    typeof qualificationFileSha256 !== "string" ||
    !HEX64.test(qualificationFileSha256)
  ) {
    fail("market_vault_live_preflight_qualification_file_sha256_invalid");
  }
  const reviewedQualification = validateQualification(
    qualification,
    sourceIdentity,
    now,
  );
  const deployer = canonicalAddress(
    deployerAddress,
    "market_vault_live_preflight_deployer_invalid",
  );
  const inventorySource = canonicalAddress(
    inventorySourceAddress,
    "market_vault_live_preflight_inventory_source_invalid",
  );

  const chain = quantity(
    await rpc("eth_chainId", []),
    "market_vault_live_preflight_chain_id_invalid",
  );
  if (chain !== CHAIN_ID) {
    fail("market_vault_live_preflight_wrong_chain");
  }

  const firstBlock = blockIdentity(
    await rpc("eth_getBlockByNumber", ["latest", false]),
    "market_vault_live_preflight_latest_block_invalid",
  );
  const nonceBeforeRaw = String(
    await rpc("eth_getTransactionCount", [deployer, "pending"]),
  ).toLowerCase();
  const nonceBefore = quantity(
    nonceBeforeRaw,
    "market_vault_live_preflight_pending_nonce_invalid",
  );

  const deployerBalanceRaw = String(
    await rpc("eth_getBalance", [deployer, firstBlock.number]),
  ).toLowerCase();
  const deployerBalance = quantity(
    deployerBalanceRaw,
    "market_vault_live_preflight_deployer_balance_invalid",
  );

  const gasPriceRaw = String(await rpc("eth_gasPrice", [])).toLowerCase();
  const gasPrice = quantity(
    gasPriceRaw,
    "market_vault_live_preflight_gas_price_invalid",
  );
  if (gasPrice <= 0n) fail("market_vault_live_preflight_gas_price_zero");

  const gasEstimateRaw = String(
    await rpc("eth_estimateGas", [
      {
        from: deployer,
        data: reviewedQualification.deploymentData,
        value: "0x0",
      },
      firstBlock.number,
    ]),
  ).toLowerCase();
  const gasEstimate = quantity(
    gasEstimateRaw,
    "market_vault_live_preflight_gas_estimate_invalid",
  );
  if (gasEstimate <= 0n) fail("market_vault_live_preflight_gas_estimate_zero");

  const tokenBalanceRaw = String(
    await rpc("eth_call", [
      {
        to: VOID_TOKEN,
        data: balanceOfData(inventorySource),
      },
      firstBlock.number,
    ]),
  ).toLowerCase();
  if (!/^0x[0-9a-f]{64}$/u.test(tokenBalanceRaw)) {
    fail("market_vault_live_preflight_inventory_balance_result_invalid");
  }
  const inventoryBalance = BigInt(tokenBalanceRaw);

  const nonceAfterRaw = String(
    await rpc("eth_getTransactionCount", [deployer, "pending"]),
  ).toLowerCase();
  const nonceAfter = quantity(
    nonceAfterRaw,
    "market_vault_live_preflight_pending_nonce_invalid",
  );
  if (nonceAfter !== nonceBefore) {
    fail("market_vault_live_preflight_pending_nonce_changed");
  }

  const confirmBlock = blockIdentity(
    await rpc("eth_getBlockByNumber", [firstBlock.number, false]),
    "market_vault_live_preflight_confirmation_block_invalid",
  );
  if (
    confirmBlock.hash !== firstBlock.hash ||
    confirmBlock.state_root !== firstBlock.state_root
  ) {
    fail("market_vault_live_preflight_observed_block_changed");
  }

  const bareEstimatedCost = gasEstimate * gasPrice;
  const bareGasBalanceSufficient = deployerBalance >= bareEstimatedCost;
  const inventoryBalanceSufficient =
    inventoryBalance >= OPENING_INVENTORY_ATOMS;
  const observationReady =
    bareGasBalanceSufficient && inventoryBalanceSufficient;

  const body = Object.freeze({
    marker: VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_V1,
    version: 1,
    status: observationReady
      ? "LIVE_DEPLOYMENT_OBSERVATION_GREEN_NOT_AUTHORIZED"
      : "LIVE_DEPLOYMENT_OBSERVATION_HOLD_NOT_AUTHORIZED",
    chain_id: Number(CHAIN_ID),
    execution_epoch: 2,
    observed_at_unix: now.toString(),
    source_binding: Object.freeze({
      source_head_sha: sourceIdentity.head,
      source_tree_sha: sourceIdentity.tree,
      canonical_remote_url: sourceIdentity.canonical_remote_url,
    }),
    qualification: Object.freeze({
      qualification_id: reviewedQualification.qualificationId,
      qualification_file_sha256: qualificationFileSha256,
      source_head_sha: qualification.source_binding.source_head_sha,
      source_tree_sha: qualification.source_binding.source_tree_sha,
      launch_controller: reviewedQualification.launchController,
      valid_until_unix: reviewedQualification.validUntilUnix,
      deployment_data_sha256:
        reviewedQualification.deploymentDataSha256,
      qualification_reexecution_performed: false,
      exact_current_generation_required: true,
    }),
    operator_selection: Object.freeze({
      deployer_address: deployer,
      inventory_source_address: inventorySource,
      selection_authorized: false,
    }),
    chain_observation: Object.freeze({
      block_number: firstBlock.number,
      block_hash: firstBlock.hash,
      state_root: firstBlock.state_root,
      pending_deployer_nonce: nonceBefore.toString(),
      pending_nonce_stable: true,
      observed_deployer_balance_wei: deployerBalance.toString(),
      observed_gas_price_wei: gasPrice.toString(),
      observed_deployment_gas_estimate: gasEstimate.toString(),
      bare_estimated_deployment_cost_wei: bareEstimatedCost.toString(),
      bare_gas_balance_sufficient: bareGasBalanceSufficient,
      gas_limit_policy_selected: false,
      fee_policy_selected: false,
      transaction_envelope_ready: false,
    }),
    inventory_observation: Object.freeze({
      void_token: VOID_TOKEN,
      required_opening_inventory_atoms: OPENING_INVENTORY_ATOMS.toString(),
      observed_inventory_source_balance_atoms: inventoryBalance.toString(),
      inventory_balance_sufficient: inventoryBalanceSufficient,
      funding_transaction_ready: false,
      funding_authorized: false,
    }),
    preflight_ready: observationReady,
    next_gate: observationReady
      ? "explicit_deployment_authorization_and_transaction_construction"
      : "resolve_observed_balance_deficit_and_rerun_preflight",
    authority:
      VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_AUTHORITY_V1,
  });

  return Object.freeze({
    ...body,
    preflight_id:
      "voidwcmvldp1_" +
      sha256(Buffer.from(canonicalJson(body), "utf8")),
  });
}

export function validateLoopbackRpcUrlV1(value) {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    fail("market_vault_live_preflight_rpc_url_invalid");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    fail("market_vault_live_preflight_rpc_url_invalid");
  }
  const host = url.hostname.toLowerCase();
  if (!["127.0.0.1", "localhost", "[::1]", "::1"].includes(host)) {
    fail("market_vault_live_preflight_loopback_rpc_required");
  }
  return url.toString();
}

export function makeHttpJsonRpcV1(rpcUrl, { timeoutMs = 5000 } = {}) {
  const url = validateLoopbackRpcUrlV1(rpcUrl);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    fail("market_vault_live_preflight_rpc_timeout_invalid");
  }
  let id = 0;
  return async (method, params) => {
    id += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        redirect: "error",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method,
          params,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        fail("market_vault_live_preflight_rpc_http_error");
      }
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > MAX_RPC_BODY_BYTES) {
        fail("market_vault_live_preflight_rpc_body_too_large");
      }
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        fail("market_vault_live_preflight_rpc_json_invalid");
      }
      if (
        !plain(body) ||
        body.jsonrpc !== "2.0" ||
        body.id !== id ||
        Object.hasOwn(body, "error") ||
        !Object.hasOwn(body, "result")
      ) {
        fail("market_vault_live_preflight_rpc_response_invalid");
      }
      return body.result;
    } finally {
      clearTimeout(timer);
    }
  };
}

function sameFileStamp(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs &&
    left.nlink === right.nlink
  );
}

function readPrivateJson(file, expectedSha) {
  if (
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    !HEX64.test(expectedSha)
  ) {
    fail("market_vault_live_preflight_input_path_invalid");
  }
  const relative = path.relative(ROOT, file);
  if (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative))
  ) {
    fail("market_vault_live_preflight_input_must_be_outside_repository");
  }
  if (fs.realpathSync.native(file) !== file) {
    fail("market_vault_live_preflight_input_alias_forbidden");
  }

  const pathStat = fs.lstatSync(file);
  if (
    !pathStat.isFile() ||
    pathStat.isSymbolicLink() ||
    pathStat.nlink !== 1 ||
    pathStat.size < 2 ||
    pathStat.size > MAX_INPUT_BYTES ||
    (pathStat.mode & 0o077) !== 0
  ) {
    fail("market_vault_live_preflight_input_file_invalid");
  }

  let fd;
  let before;
  let bytes;
  let after;
  try {
    fd = fs.openSync(
      file,
      fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
    );
    before = fs.fstatSync(fd);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.dev !== pathStat.dev ||
      before.ino !== pathStat.ino
    ) {
      fail("market_vault_live_preflight_input_descriptor_mismatch");
    }
    bytes = fs.readFileSync(fd);
    after = fs.fstatSync(fd);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }

  const post = fs.lstatSync(file);
  if (
    bytes.length !== before.size ||
    !sameFileStamp(before, after) ||
    !sameFileStamp(before, post)
  ) {
    fail("market_vault_live_preflight_input_changed_during_read");
  }
  if (sha256(bytes) !== expectedSha) {
    fail("market_vault_live_preflight_input_sha256_mismatch");
  }
  let value;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    fail("market_vault_live_preflight_input_json_invalid");
  }
  return value;
}

function writePrivateJson(file, value) {
  if (!path.isAbsolute(file) || path.resolve(file) !== file) {
    fail("market_vault_live_preflight_output_path_invalid");
  }
  const relative = path.relative(ROOT, file);
  if (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative))
  ) {
    fail("market_vault_live_preflight_output_must_be_outside_repository");
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) {
    fail("market_vault_live_preflight_output_parent_alias_forbidden");
  }
  const parentStat = fs.lstatSync(parent);
  if (
    !parentStat.isDirectory() ||
    parentStat.isSymbolicLink() ||
    (parentStat.mode & 0o022) !== 0
  ) {
    fail("market_vault_live_preflight_output_parent_unsafe");
  }
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n");
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (direct) {
  try {
    const { values } = parseArgs({
      options: {
        qualification: { type: "string" },
        "qualification-sha256": { type: "string" },
        deployer: { type: "string" },
        "inventory-source": { type: "string" },
        "rpc-url": { type: "string" },
        output: { type: "string" },
      },
      strict: true,
    });
    for (const key of [
      "qualification",
      "qualification-sha256",
      "deployer",
      "inventory-source",
      "rpc-url",
      "output",
    ]) {
      if (!values[key]) fail("market_vault_live_preflight_cli_argument_missing:" + key);
    }

    const sourceIdentity =
      currentVoidWcVoidMarketVaultLivePreflightSourceV1();
    const qualification = readPrivateJson(
      path.resolve(values.qualification),
      String(values["qualification-sha256"]),
    );
    const rpc = makeHttpJsonRpcV1(values["rpc-url"]);
    const receipt =
      await collectVoidWcVoidMarketVaultLiveDeploymentObservationsV1({
        rpc,
        qualification,
        qualificationFileSha256: String(values["qualification-sha256"]),
        sourceIdentity,
        deployerAddress: values.deployer,
        inventorySourceAddress: values["inventory-source"],
        nowUnix: Math.floor(Date.now() / 1000),
      });
    writePrivateJson(path.resolve(values.output), receipt);

    console.log(VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_V1);
    console.log("status=" + receipt.status);
    console.log("preflight_id=" + receipt.preflight_id);
    console.log("preflight_ready=" + String(receipt.preflight_ready));
    console.log(
      "bare_gas_balance_sufficient=" +
        String(receipt.chain_observation.bare_gas_balance_sufficient),
    );
    console.log(
      "inventory_balance_sufficient=" +
        String(receipt.inventory_observation.inventory_balance_sufficient),
    );
    console.log("qualification_reexecution_performed=false");
    console.log("transaction_envelope_ready=false");
    console.log("deployment_authorized=false");
    console.log("inventory_funding_authorized=false");
    console.log("transaction_signing=false");
    console.log("transaction_broadcast=false");
    console.log("funds_movement=false");
    console.log("output=" + path.resolve(values.output));
    if (!receipt.preflight_ready) process.exitCode = 2;
  } catch (error) {
    console.error(
      "VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_PREFLIGHT_V1_HOLD",
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
