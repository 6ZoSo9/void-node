#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import * as http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1,
} from "./void-wc-void-market-vault-role-deployment-qualification-v1.mjs";

export const VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1 =
  "VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1";

export const VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1 =
  Object.freeze({
    qualification_receipt_required: true,
    exact_qualification_bytes_required: true,
    qualification_current_head_required: true,
    canonical_source_revalidation_required: true,
    explicit_deployer_recorded_not_authorized: true,
    explicit_inventory_source_recorded_not_authorized: true,
    canonical_chain_id: "2050",
    loopback_http_only: true,
    fixed_block_observation: true,
    pending_nonce_revalidation_required: true,
    observation_block_hash_revalidation_required: true,
    block_bound_deployer_balance_required: true,
    exact_deployment_data_gas_estimate_required: true,
    gas_price_observation_required: true,
    canonical_void_balance_of_required: true,
    opening_inventory_atoms_required:
      "10000000000000000000000000",
    read_only_rpc_methods: Object.freeze([
      "eth_chainId",
      "eth_blockNumber",
      "eth_getBlockByNumber",
      "eth_getTransactionCount",
      "eth_getBalance",
      "eth_gasPrice",
      "eth_estimateGas",
      "eth_call",
    ]),
    qualification_reexecution: false,
    deployer_selection_authorized: false,
    inventory_source_selection_authorized: false,
    gas_limit_policy_selected: false,
    fee_policy_selected: false,
    transaction_envelope_construction: false,
    credential_access: false,
    private_key_access: false,
    wallet_or_signer_access: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    deployment: false,
    chain2050_write: false,
    inventory_funding: false,
    token_transfer: false,
    market_activation: false,
    public_presale_activation: false,
    automatic_retry: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";
const QUALIFICATION_TOOL_REL =
  "tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";
const PREFLIGHT_TOOL_REL =
  "tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs";
const CANONICAL_REMOTE = "https://github.com/6ZoSo9/void-node.git";
const OPENING_INVENTORY_ATOMS = 10000000000000000000000000n;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const QUALIFICATION_ID = /^voidwcvrdq1_[0-9a-f]{64}$/u;
const PREFLIGHT_ID = /^voidwcmvldop1_[0-9a-f]{64}$/u;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/iu;
const HEX_BYTES = /^0x(?:[0-9a-f]{2})*$/iu;
const HEX32_BYTES = /^0x[0-9a-f]{64}$/iu;
const MAX_QUALIFICATION_BYTES = 8 * 1024 * 1024;
const MAX_DEPLOYMENT_DATA_BYTES = 4 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
const MAX_DEPLOYMENT_GAS_ESTIMATE = 30_000_000n;

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + String(bytes.length) + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function text(value) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function canonicalAddress(value, code) {
  const normalized = text(value).toLowerCase();
  if (
    !ADDRESS.test(normalized) ||
    normalized === "0x0000000000000000000000000000000000000000"
  ) {
    fail(code);
  }
  return normalized;
}

function quantity(value, code) {
  const raw = text(value);
  if (!HEX_QUANTITY.test(raw)) fail(code);
  try {
    return BigInt(raw);
  } catch {
    fail(code);
  }
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
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
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
  };
}

function gitSafetyArgs() {
  return [
    "-c", "core.worktree=" + ROOT,
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    "-c", "core.attributesFile=/dev/null",
    "-c", "core.untrackedCache=false",
    "-c", "core.preloadIndex=false",
    "-c", "submodule.recurse=false",
  ];
}

function git(args, code, { allowFail = false } = {}) {
  const result = spawnSync(
    GIT,
    ["--no-replace-objects", ...gitSafetyArgs(), "-C", ROOT, ...args],
    {
      env: gitEnv(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
      timeout: 60_000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFail) fail(code);
  return result;
}

function gitText(args, code) {
  return String(git(args, code).stdout || "").trim();
}

function repositoryIdentity() {
  const head = gitText(["rev-parse", "HEAD"], "live_deployment_preflight_head_unavailable");
  const tree = gitText(
    ["rev-parse", "HEAD^{tree}"],
    "live_deployment_preflight_tree_unavailable",
  );
  const status = gitText(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "live_deployment_preflight_status_unavailable",
  );
  const origin = gitText(
    ["config", "--local", "--no-includes", "--get", "remote.origin.url"],
    "live_deployment_preflight_origin_unavailable",
  );
  const qualificationToolBlob = gitText(
    ["rev-parse", "HEAD:" + QUALIFICATION_TOOL_REL],
    "live_deployment_preflight_qualification_tool_blob_unavailable",
  );
  const preflightToolBlob = gitText(
    ["rev-parse", "HEAD:" + PREFLIGHT_TOOL_REL],
    "live_deployment_preflight_tool_blob_unavailable",
  );
  if (
    !HEX40.test(head) ||
    !HEX40.test(tree) ||
    status !== "" ||
    origin !== CANONICAL_REMOTE ||
    !HEX40.test(qualificationToolBlob) ||
    !HEX40.test(preflightToolBlob)
  ) {
    fail("live_deployment_preflight_repository_identity_invalid");
  }
  return Object.freeze({
    head,
    tree,
    origin,
    qualification_tool_git_blob_sha1: qualificationToolBlob,
    preflight_tool_git_blob_sha1: preflightToolBlob,
  });
}

function currentFileIdentity(relativePath, expectedBlob, code) {
  const file = path.join(ROOT, relativePath);
  const bytes = fs.readFileSync(file);
  const actualBlob = gitBlobSha1(bytes);
  const headBlob = gitText(
    ["rev-parse", "HEAD:" + relativePath],
    code + "_head_blob_unavailable",
  );
  if (
    !HEX40.test(headBlob) ||
    headBlob !== expectedBlob ||
    actualBlob !== expectedBlob
  ) {
    fail(code);
  }
  return Object.freeze({
    git_blob_sha1: actualBlob,
    file_sha256: sha256Bytes(bytes),
  });
}

function parsePrettyQualification(bytes, expectedSha) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 2 ||
    bytes.length > MAX_QUALIFICATION_BYTES ||
    typeof expectedSha !== "string" ||
    !HEX64.test(expectedSha) ||
    sha256Bytes(bytes) !== expectedSha
  ) {
    fail("live_deployment_preflight_qualification_bytes_invalid");
  }
  let qualification;
  try {
    qualification = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    fail("live_deployment_preflight_qualification_json_invalid");
  }
  if (
    !Buffer.from(JSON.stringify(qualification, null, 2) + "\n", "utf8").equals(bytes)
  ) {
    fail("live_deployment_preflight_qualification_serialization_invalid");
  }
  return qualification;
}

function verifyQualification(bytes, expectedSha, repo) {
  const q = parsePrettyQualification(bytes, expectedSha);
  exactObject(
    q,
    [
      "marker", "version", "status", "chain_id", "execution_epoch",
      "coupled_launch_id", "source_binding", "launch_controller",
      "settlement_executor", "closeout_controller", "role_separation",
      "reviewed_package_runtime", "vault_identity", "deployment_preparation",
      "next_gate", "authority", "qualification_id",
    ],
    "live_deployment_preflight_qualification_shape_invalid",
  );

  if (
    q.marker !== VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1 ||
    q.version !== 1 ||
    q.status !== "QUALIFIED_DEPLOYMENT_PREPARATION_READY_NOT_AUTHORIZED" ||
    q.chain_id !== 2050 ||
    q.execution_epoch !== 2 ||
    !SHA256_ID.test(String(q.coupled_launch_id || "")) ||
    !QUALIFICATION_ID.test(String(q.qualification_id || "")) ||
    q.next_gate !==
      "separately_authorized_exact_market_vault_deployment_and_inventory_lock" ||
    canonicalJson(q.authority) !==
      canonicalJson(
        VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1,
      )
  ) {
    fail("live_deployment_preflight_qualification_semantics_invalid");
  }

  const material = structuredClone(q);
  delete material.qualification_id;
  const derivedQualificationId =
    "voidwcvrdq1_" +
    sha256Bytes(Buffer.from(canonicalJson(material), "utf8"));
  if (derivedQualificationId !== q.qualification_id) {
    fail("live_deployment_preflight_qualification_id_mismatch");
  }

  const source = exactObject(
    q.source_binding,
    [
      "source_head_sha", "source_tree_sha", "canonical_remote_url",
      "reviewed_main_anchor", "qualification_tool_git_blob_sha1",
      "qualification_tool_file_sha256", "dependency_git_blobs",
      "dependency_file_sha256",
    ],
    "live_deployment_preflight_source_binding_shape_invalid",
  );
  if (
    source.source_head_sha !== repo.head ||
    source.source_tree_sha !== repo.tree ||
    source.canonical_remote_url !== CANONICAL_REMOTE ||
    source.qualification_tool_git_blob_sha1 !==
      repo.qualification_tool_git_blob_sha1 ||
    !HEX40.test(String(source.reviewed_main_anchor || "")) ||
    !HEX64.test(String(source.qualification_tool_file_sha256 || ""))
  ) {
    fail("live_deployment_preflight_source_generation_mismatch");
  }
  const anchor = git(
    ["merge-base", "--is-ancestor", source.reviewed_main_anchor, repo.head],
    "live_deployment_preflight_reviewed_anchor_not_ancestor",
    { allowFail: true },
  );
  if (anchor.status !== 0) {
    fail("live_deployment_preflight_reviewed_anchor_not_ancestor");
  }

  const qualificationToolIdentity = currentFileIdentity(
    QUALIFICATION_TOOL_REL,
    repo.qualification_tool_git_blob_sha1,
    "live_deployment_preflight_qualification_tool_drift",
  );
  if (
    qualificationToolIdentity.file_sha256 !==
      source.qualification_tool_file_sha256
  ) {
    fail("live_deployment_preflight_qualification_tool_sha256_mismatch");
  }

  if (
    !plain(source.dependency_git_blobs) ||
    !plain(source.dependency_file_sha256) ||
    canonicalJson(source.dependency_git_blobs) !==
      canonicalJson(
        VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
      )
  ) {
    fail("live_deployment_preflight_dependency_manifest_mismatch");
  }
  const dependencyKeys = Object.keys(
    VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  ).sort();
  if (
    Object.keys(source.dependency_file_sha256).sort().join("\n") !==
      dependencyKeys.join("\n")
  ) {
    fail("live_deployment_preflight_dependency_sha_manifest_mismatch");
  }
  for (const relativePath of dependencyKeys) {
    const expectedBlob =
      VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1[
        relativePath
      ];
    const identity = currentFileIdentity(
      relativePath,
      expectedBlob,
      "live_deployment_preflight_dependency_drift:" + relativePath,
    );
    if (identity.file_sha256 !== source.dependency_file_sha256[relativePath]) {
      fail("live_deployment_preflight_dependency_sha_drift:" + relativePath);
    }
  }

  const launchController = canonicalAddress(
    q.launch_controller?.address,
    "live_deployment_preflight_launch_controller_invalid",
  );
  const settlementExecutor = canonicalAddress(
    q.settlement_executor?.address,
    "live_deployment_preflight_settlement_executor_invalid",
  );
  const closeoutController = canonicalAddress(
    q.closeout_controller?.address,
    "live_deployment_preflight_closeout_controller_invalid",
  );
  const token = canonicalAddress(
    q.vault_identity?.canonical_void_token,
    "live_deployment_preflight_void_token_invalid",
  );
  if (
    new Set([launchController, settlementExecutor, closeoutController, token])
      .size !== 4 ||
    q.role_separation?.all_addresses_nonzero !== true ||
    q.role_separation?.all_addresses_distinct !== true ||
    q.role_separation?.void_token_distinct_from_all_roles !== true ||
    q.launch_controller?.control_verified !== true ||
    q.launch_controller?.role_binding_authorized !== false ||
    q.settlement_executor?.public_identity_requalified !== true ||
    q.settlement_executor?.role_binding_authorized !== false ||
    q.closeout_controller?.public_identity_requalified !== true ||
    q.closeout_controller?.role_binding_authorized !== false
  ) {
    fail("live_deployment_preflight_role_binding_invalid");
  }

  if (
    q.reviewed_package_runtime?.reviewed_package_bytes_verified !== true ||
    q.reviewed_package_runtime?.ancestor_package_resolution_preempted !== true ||
    q.reviewed_package_runtime?.execution_network_isolation_provided !== false ||
    JSON.stringify(q.reviewed_package_runtime?.root_packages) !==
      JSON.stringify(["ethers"]) ||
    !HEX40.test(
      String(q.reviewed_package_runtime?.runtime_tool_git_blob_sha1 || ""),
    ) ||
    !HEX40.test(
      String(q.reviewed_package_runtime?.runtime_profile_git_blob_sha1 || ""),
    ) ||
    !HEX64.test(
      String(q.reviewed_package_runtime?.packages_aggregate_sha256 || ""),
    )
  ) {
    fail("live_deployment_preflight_reviewed_runtime_binding_invalid");
  }

  const prep = q.deployment_preparation;
  if (!plain(prep)) {
    fail("live_deployment_preflight_deployment_preparation_invalid");
  }
  const deploymentHex = String(prep.deployment_data_hex || "").toLowerCase();
  if (
    !HEX_BYTES.test(deploymentHex) ||
    deploymentHex === "0x" ||
    prep.exact_creation_payload_ready !== true ||
    prep.deployer_selected !== false ||
    prep.nonce_observed !== false ||
    prep.fee_observed !== false ||
    prep.transaction_envelope_ready !== false ||
    prep.deployment_authorized !== false ||
    prep.inventory_funding_authorized !== false
  ) {
    fail("live_deployment_preflight_deployment_preparation_invalid");
  }
  const deploymentBytes = Buffer.from(deploymentHex.slice(2), "hex");
  if (
    deploymentBytes.length < 1 ||
    deploymentBytes.length > MAX_DEPLOYMENT_DATA_BYTES ||
    prep.deployment_data_bytes !== deploymentBytes.length ||
    !HEX64.test(String(prep.deployment_data_sha256 || "")) ||
    sha256Bytes(deploymentBytes) !== prep.deployment_data_sha256
  ) {
    fail("live_deployment_preflight_deployment_data_identity_invalid");
  }
  const ctor = prep.constructor;
  if (
    !plain(ctor) ||
    ctor.constructor_signature !==
      "constructor(address,address,address,address,bytes32)" ||
    JSON.stringify(ctor.constructor_order) !==
      JSON.stringify([
        "void_token",
        "launch_controller",
        "settlement_executor",
        "closeout_controller",
        "coupled_launch_id",
      ]) ||
    canonicalAddress(
      ctor.values?.void_token,
      "live_deployment_preflight_constructor_token_invalid",
    ) !== token ||
    canonicalAddress(
      ctor.values?.launch_controller,
      "live_deployment_preflight_constructor_launch_controller_invalid",
    ) !== launchController ||
    canonicalAddress(
      ctor.values?.settlement_executor,
      "live_deployment_preflight_constructor_settlement_executor_invalid",
    ) !== settlementExecutor ||
    canonicalAddress(
      ctor.values?.closeout_controller,
      "live_deployment_preflight_constructor_closeout_invalid",
    ) !== closeoutController ||
    String(ctor.values?.coupled_launch_id || "").toLowerCase() !==
      "0x" + q.coupled_launch_id.slice("sha256:".length)
  ) {
    fail("live_deployment_preflight_constructor_binding_invalid");
  }

  return Object.freeze({
    qualification: q,
    qualification_file_sha256: expectedSha,
    deployment_data_hex: deploymentHex,
    void_token: token,
  });
}

function boundedPositive(value, fallback, maximum) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function normalizeRpcPolicy(input) {
  let url;
  try {
    url = new URL(text(input?.rpc_url));
  } catch {
    return null;
  }
  const host = url.hostname
    .toLowerCase()
    .replace(/^\[/u, "")
    .replace(/\]$/u, "");
  const hostname =
    host === "127.0.0.1" ? "127.0.0.1" : host === "::1" ? "::1" : null;
  const port = Number(url.port || 0);
  const timeout = boundedPositive(
    input?.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxBytes = boundedPositive(
    input?.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  if (
    !hostname ||
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535 ||
    !url.pathname.startsWith("/") ||
    url.pathname.length > 256 ||
    timeout === null ||
    maxBytes === null
  ) {
    return null;
  }
  const rendered = hostname === "::1" ? "[::1]" : hostname;
  const normalized =
    "http://" + rendered + ":" + String(port) + url.pathname;
  return Object.freeze({
    rpc_url: normalized,
    rpc_url_fingerprint_sha256: sha256Bytes(Buffer.from(normalized, "utf8")),
    hostname,
    port,
    path: url.pathname,
    request_timeout_ms: timeout,
    max_response_bytes: maxBytes,
  });
}

function createHttpTransport(policy) {
  let nextId = 0;
  return async ({ method, params }) => {
    const id = ++nextId;
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("live_deployment_preflight_request_too_large");
    }
    return await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(value);
      };
      const request = http.request(
        {
          protocol: "http:",
          hostname: policy.hostname,
          port: policy.port,
          path: policy.path,
          method: "POST",
          family: policy.hostname === "::1" ? 6 : 4,
          agent: false,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Length": String(Buffer.byteLength(body, "utf8")),
            Connection: "close",
            "User-Agent":
              "void-wc-void-market-vault-live-deployment-observation-preflight-v1",
          },
        },
        (response) => {
          const chunks = [];
          let total = 0;
          response.on("data", (chunk) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            total += buffer.length;
            if (total > policy.max_response_bytes) {
              request.destroy(
                new Error("live_deployment_preflight_response_too_large"),
              );
              return;
            }
            chunks.push(buffer);
          });
          response.on("end", () => {
            if (Number(response.statusCode || 0) !== 200) {
              finish(new Error("live_deployment_preflight_http_status_invalid"));
              return;
            }
            let payload;
            try {
              payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
              finish(new Error("live_deployment_preflight_rpc_json_invalid"));
              return;
            }
            if (
              !plain(payload) ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== id ||
              payload.error ||
              !Object.prototype.hasOwnProperty.call(payload, "result")
            ) {
              finish(
                new Error("live_deployment_preflight_rpc_envelope_invalid"),
              );
              return;
            }
            finish(null, payload.result);
          });
        },
      );
      request.setTimeout(policy.request_timeout_ms);
      request.on("timeout", () => {
        request.destroy(new Error("live_deployment_preflight_timeout"));
      });
      request.on("error", (error) => finish(error));
      request.end(body);
    });
  };
}

function balanceOfCalldata(account) {
  return "0x70a08231" + "0".repeat(24) + account.slice(2);
}

function held(reason, detail = {}) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker:
      VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1,
    version: 1,
    reason,
    detail,
    transaction_envelope_constructed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    deployment_performed: false,
    inventory_funding_performed: false,
    token_transfer_performed: false,
    chain2050_write_performed: false,
    market_activation_performed: false,
    public_presale_activation_performed: false,
    funds_movement_performed: false,
  });
}

export async function observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
  input,
) {
  let repo;
  let verifiedQualification;
  let deployer;
  let inventorySource;
  let rpcPolicy;
  try {
    repo = repositoryIdentity();
    verifiedQualification = verifyQualification(
      input?.qualification_bytes,
      input?.qualification_file_sha256,
      repo,
    );
    deployer = canonicalAddress(
      input?.deployer_address,
      "live_deployment_preflight_deployer_invalid",
    );
    inventorySource = canonicalAddress(
      input?.inventory_source_address,
      "live_deployment_preflight_inventory_source_invalid",
    );
    rpcPolicy = normalizeRpcPolicy(input);
    if (!rpcPolicy) fail("live_deployment_preflight_rpc_policy_invalid");
  } catch (error) {
    return held(
      error instanceof Error ? error.message : String(error),
    );
  }

  const methods = [];
  const transport = input?.transport || createHttpTransport(rpcPolicy);
  const call = async (method, params) => {
    methods.push(method);
    return await transport({ method, params });
  };

  try {
    const chainId = quantity(
      await call("eth_chainId", []),
      "live_deployment_preflight_chain_id_invalid",
    );
    if (chainId !== 2050n) {
      return held("live_deployment_preflight_chain_id_mismatch", {
        rpc_methods_used: methods,
      });
    }

    const head = quantity(
      await call("eth_blockNumber", []),
      "live_deployment_preflight_head_invalid",
    );
    if (head <= 0n) {
      return held("live_deployment_preflight_head_invalid", {
        rpc_methods_used: methods,
      });
    }
    const blockTag = "0x" + head.toString(16);

    const blockA = await call("eth_getBlockByNumber", [blockTag, false]);
    const blockHash = text(blockA?.hash).toLowerCase();
    const blockTimestamp = quantity(
      blockA?.timestamp,
      "live_deployment_preflight_block_timestamp_invalid",
    );
    if (
      !/^0x[0-9a-f]{64}$/u.test(blockHash) ||
      quantity(
        blockA?.number,
        "live_deployment_preflight_block_number_invalid",
      ) !== head
    ) {
      return held("live_deployment_preflight_block_invalid", {
        rpc_methods_used: methods,
      });
    }

    const latestNonce = quantity(
      await call("eth_getTransactionCount", [deployer, blockTag]),
      "live_deployment_preflight_latest_nonce_invalid",
    );
    const pendingNonceA = quantity(
      await call("eth_getTransactionCount", [deployer, "pending"]),
      "live_deployment_preflight_pending_nonce_invalid",
    );
    if (pendingNonceA < latestNonce) {
      return held("live_deployment_preflight_pending_nonce_below_latest", {
        rpc_methods_used: methods,
      });
    }

    const deployerBalance = quantity(
      await call("eth_getBalance", [deployer, blockTag]),
      "live_deployment_preflight_deployer_balance_invalid",
    );
    const gasPrice = quantity(
      await call("eth_gasPrice", []),
      "live_deployment_preflight_gas_price_invalid",
    );
    const gasEstimate = quantity(
      await call("eth_estimateGas", [
        {
          from: deployer,
          data: verifiedQualification.deployment_data_hex,
          value: "0x0",
        },
        blockTag,
      ]),
      "live_deployment_preflight_gas_estimate_invalid",
    );
    if (gasEstimate <= 0n || gasEstimate > MAX_DEPLOYMENT_GAS_ESTIMATE) {
      return held("live_deployment_preflight_gas_estimate_out_of_range", {
        rpc_methods_used: methods,
      });
    }

    const balanceRaw = text(
      await call("eth_call", [
        {
          to: verifiedQualification.void_token,
          data: balanceOfCalldata(inventorySource),
        },
        blockTag,
      ]),
    ).toLowerCase();
    if (!HEX32_BYTES.test(balanceRaw)) {
      return held("live_deployment_preflight_inventory_balance_call_invalid", {
        rpc_methods_used: methods,
      });
    }
    const inventoryBalance = BigInt(balanceRaw);

    const pendingNonceB = quantity(
      await call("eth_getTransactionCount", [deployer, "pending"]),
      "live_deployment_preflight_pending_nonce_revalidation_invalid",
    );
    const blockB = await call("eth_getBlockByNumber", [blockTag, false]);
    if (
      pendingNonceB !== pendingNonceA ||
      text(blockB?.hash).toLowerCase() !== blockHash ||
      quantity(
        blockB?.number,
        "live_deployment_preflight_block_revalidation_number_invalid",
      ) !== head ||
      quantity(
        blockB?.timestamp,
        "live_deployment_preflight_block_revalidation_timestamp_invalid",
      ) !== blockTimestamp
    ) {
      return held("live_deployment_preflight_revalidation_mismatch", {
        rpc_methods_used: methods,
      });
    }

    const bareEstimatedCost = gasEstimate * gasPrice;
    const deployerBalanceSufficient = deployerBalance >= bareEstimatedCost;
    const inventoryBalanceSufficient =
      inventoryBalance >= OPENING_INVENTORY_ATOMS;

    const material = Object.freeze({
      marker:
        VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1,
      version: 1,
      status: "LIVE_DEPLOYMENT_OBSERVATION_COMPLETE_NOT_AUTHORIZED",
      chain_id: "2050",
      repository: Object.freeze({
        head_sha: repo.head,
        tree_sha: repo.tree,
        canonical_remote_url: repo.origin,
        preflight_tool_git_blob_sha1: repo.preflight_tool_git_blob_sha1,
      }),
      qualification: Object.freeze({
        qualification_id:
          verifiedQualification.qualification.qualification_id,
        qualification_file_sha256:
          verifiedQualification.qualification_file_sha256,
        qualification_source_head_sha:
          verifiedQualification.qualification.source_binding.source_head_sha,
        deployment_data_sha256:
          verifiedQualification.qualification.deployment_preparation
            .deployment_data_sha256,
      }),
      operator_selections: Object.freeze({
        deployer_address: deployer,
        inventory_source_address: inventorySource,
        deployer_selection_authorized: false,
        inventory_source_selection_authorized: false,
      }),
      rpc: Object.freeze({
        rpc_url_fingerprint_sha256:
          rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used: Object.freeze([...methods]),
        loopback_http_only: true,
      }),
      observation: Object.freeze({
        block_number: head.toString(),
        block_hash: blockHash,
        block_timestamp_unix: blockTimestamp.toString(),
        latest_deployer_nonce: latestNonce.toString(),
        pending_deployer_nonce: pendingNonceA.toString(),
        pending_transactions_present: pendingNonceA > latestNonce,
        pending_nonce_revalidated: true,
        deployer_native_balance_wei: deployerBalance.toString(),
        gas_price_wei: gasPrice.toString(),
        deployment_gas_estimate: gasEstimate.toString(),
        bare_estimated_deployment_cost_wei: bareEstimatedCost.toString(),
        deployer_balance_covers_bare_estimate: deployerBalanceSufficient,
        canonical_void_token: verifiedQualification.void_token,
        inventory_source_void_balance_atoms: inventoryBalance.toString(),
        opening_inventory_required_atoms: OPENING_INVENTORY_ATOMS.toString(),
        inventory_source_covers_opening_inventory: inventoryBalanceSufficient,
        fixed_block_observation: true,
        observation_block_hash_revalidated: true,
      }),
      sufficiency: Object.freeze({
        bare_gas_balance_observation_green: deployerBalanceSufficient,
        opening_inventory_balance_observation_green: inventoryBalanceSufficient,
        observation_sufficiency_green:
          deployerBalanceSufficient && inventoryBalanceSufficient,
      }),
      next_gate:
        deployerBalanceSufficient && inventoryBalanceSufficient
          ? "separately_review_gas_limit_fee_policy_nonce_use_and_deployment_authority"
          : "resolve_observed_balance_shortfall_then_repeat_preflight",
      authority:
        VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1,
    });

    const preflight = Object.freeze({
      ...material,
      preflight_id:
        "voidwcmvldop1_" +
        sha256Bytes(Buffer.from(canonicalJson(material), "utf8")),
    });
    if (!PREFLIGHT_ID.test(preflight.preflight_id)) {
      return held("live_deployment_preflight_id_invalid");
    }
    return Object.freeze({
      ok: true,
      preflight,
    });
  } catch (error) {
    return held("live_deployment_preflight_rpc_failed", {
      rpc_methods_used: methods,
      error_class:
        error instanceof Error ? error.name.slice(0, 80) : "Error",
      message:
        (error instanceof Error ? error.message : String(error)).slice(0, 240),
    });
  }
}

function outsideRepository(file) {
  const relative = path.relative(ROOT, file);
  return (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  );
}

function readPrivateFile(file, expectedSha, label) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    !outsideRepository(file) ||
    typeof expectedSha !== "string" ||
    !HEX64.test(expectedSha)
  ) {
    fail(label + "_path_or_sha_invalid");
  }
  if (fs.realpathSync.native(file) !== file) fail(label + "_path_alias_forbidden");
  const pathStat = fs.lstatSync(file);
  if (
    !pathStat.isFile() ||
    pathStat.isSymbolicLink() ||
    pathStat.nlink !== 1 ||
    pathStat.size < 2 ||
    pathStat.size > MAX_QUALIFICATION_BYTES ||
    (pathStat.mode & 0o077) !== 0
  ) {
    fail(label + "_file_invalid");
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
      before.ino !== pathStat.ino ||
      before.size !== pathStat.size
    ) {
      fail(label + "_descriptor_mismatch");
    }
    bytes = fs.readFileSync(fd);
    after = fs.fstatSync(fd);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs ||
    before.ctimeMs !== after.ctimeMs ||
    sha256Bytes(bytes) !== expectedSha
  ) {
    fail(label + "_changed_or_sha_mismatch");
  }
  return bytes;
}

function writePrivateJson(file, value) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    !outsideRepository(file)
  ) {
    fail("live_deployment_preflight_output_path_invalid");
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) {
    fail("live_deployment_preflight_output_parent_alias_forbidden");
  }
  const parentStat = fs.lstatSync(parent);
  if (
    !parentStat.isDirectory() ||
    parentStat.isSymbolicLink() ||
    (parentStat.mode & 0o022) !== 0
  ) {
    fail("live_deployment_preflight_output_parent_unsafe");
  }
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
  let fd;
  try {
    fd = fs.openSync(
      file,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        Number(fs.constants.O_NOFOLLOW || 0),
      0o600,
    );
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const { values } = parseArgs({
      options: {
        qualification: { type: "string" },
        "expected-qualification-sha256": { type: "string" },
        deployer: { type: "string" },
        "inventory-source": { type: "string" },
        rpc: { type: "string" },
        output: { type: "string" },
      },
      strict: true,
    });
    if (
      !values.qualification ||
      !values["expected-qualification-sha256"] ||
      !values.deployer ||
      !values["inventory-source"] ||
      !values.rpc ||
      !values.output
    ) {
      fail(
        "usage: --qualification /absolute/qualification.json " +
        "--expected-qualification-sha256 <64hex> " +
        "--deployer <0xaddress> --inventory-source <0xaddress> " +
        "--rpc http://127.0.0.1:PORT/ --output /absolute/preflight.json",
      );
    }
    const qualificationBytes = readPrivateFile(
      path.resolve(values.qualification),
      values["expected-qualification-sha256"],
      "live_deployment_preflight_qualification",
    );
    const result =
      await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1({
        qualification_bytes: qualificationBytes,
        qualification_file_sha256:
          values["expected-qualification-sha256"],
        deployer_address: values.deployer,
        inventory_source_address: values["inventory-source"],
        rpc_url: values.rpc,
      });
    if (!result.ok) {
      console.error(
        "VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1_HOLD",
      );
      console.error("reason=" + result.reason);
      process.exitCode = 2;
    } else {
      writePrivateJson(path.resolve(values.output), result.preflight);
      console.log(
        VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1,
      );
      console.log("status=" + result.preflight.status);
      console.log("preflight_id=" + result.preflight.preflight_id);
      console.log(
        "observation_sufficiency_green=" +
          String(result.preflight.sufficiency.observation_sufficiency_green),
      );
      console.log("transaction_envelope_construction=false");
      console.log("transaction_signing=false");
      console.log("transaction_broadcast=false");
      console.log("deployment=false");
      console.log("inventory_funding=false");
      console.log("token_transfer=false");
      console.log("market_activation=false");
      console.log("public_presale_activation=false");
      console.log("funds_movement=false");
      console.log("output=" + path.resolve(values.output));
    }
  } catch (error) {
    console.error(
      "VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1_HOLD",
    );
    console.error(
      "reason=" + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 2;
  }
}
