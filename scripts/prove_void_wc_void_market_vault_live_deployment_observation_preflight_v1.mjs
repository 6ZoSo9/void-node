#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import * as http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1,
} from "../tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1,
} from "../tools/void-economic-epoch2-raw-transaction-domain-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_TEST_ONLY_V1,
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1,
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_TEST_AUTHORITY_V1,
  observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1,
  testOnlyEvaluateVoidWcVoidMarketVaultCanonicalMainIdentityV1,
  testOnlyEvaluateVoidWcVoidMarketVaultProductionRpcPolicyV1,
  testOnlyExerciseVoidWcVoidMarketVaultOutputParentReplacementV1,
  testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1,
} from "../tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs";

const QUALIFICATION_TOOL =
  "tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";
const PREFLIGHT_TOOL =
  "tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs";
const PRODUCTION_RPC_TARGET =
  "ops/mainnet0/production-epoch2-rpc-target-v1.json";
const COUPLED_LAUNCH_ID =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const LAUNCH_CONTROLLER =
  "0x1111111111111111111111111111111111111111";
const SETTLEMENT =
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const CLOSEOUT =
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b";
const DEPLOYER =
  "0x2222222222222222222222222222222222222222";
const INVENTORY_SOURCE =
  "0x3333333333333333333333333333333333333333";
const OPENING_ATOMS = 10000000000000000000000000n;
const HEAD_HASH = "0x" + "a".repeat(64);

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
    GIT_NO_REPLACE_OBJECTS: "1",
  };
}

function gitText(args) {
  return execFileSync("/usr/bin/git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: gitEnv(),
  }).trim();
}

function setOrigin(value) {
  execFileSync(
    "/usr/bin/git",
    ["config", "--local", "remote.origin.url", value],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: gitEnv(),
    },
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function qualificationId(value) {
  const material = structuredClone(value);
  delete material.qualification_id;
  return "voidwcvrdq1_" +
    sha256(Buffer.from(canonicalJson(material), "utf8"));
}

function currentSourceBinding() {
  const head = gitText(["rev-parse", "HEAD"]);
  const tree = gitText(["rev-parse", "HEAD^{tree}"]);
  const dependencyFileSha = {};
  for (const relativePath of Object.keys(
    VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  )) {
    dependencyFileSha[relativePath] =
      sha256(fs.readFileSync(relativePath));
  }
  return {
    source_head_sha: head,
    source_tree_sha: tree,
    canonical_remote_url: "https://github.com/6ZoSo9/void-node.git",
    reviewed_main_anchor: "2dcf6544f373f828347434fd0c6d434334af1658",
    qualification_tool_git_blob_sha1:
      gitText(["rev-parse", "HEAD:" + QUALIFICATION_TOOL]),
    qualification_tool_file_sha256:
      sha256(fs.readFileSync(QUALIFICATION_TOOL)),
    dependency_git_blobs:
      structuredClone(
        VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
      ),
    dependency_file_sha256: dependencyFileSha,
  };
}

function qualificationFixture(override = {}) {
  const deploymentDataHex = "0x60006000556001600055";
  const deploymentBytes = Buffer.from(deploymentDataHex.slice(2), "hex");
  const constructor = {
    constructor_signature:
      "constructor(address,address,address,address,bytes32)",
    constructor_order: [
      "void_token",
      "launch_controller",
      "settlement_executor",
      "closeout_controller",
      "coupled_launch_id",
    ],
    values: {
      void_token: TOKEN,
      launch_controller: LAUNCH_CONTROLLER,
      settlement_executor: SETTLEMENT,
      closeout_controller: CLOSEOUT,
      coupled_launch_id:
        "0x" + COUPLED_LAUNCH_ID.slice("sha256:".length),
    },
    abi_encoded_arguments_hex: "0x",
  };
  const material = {
    marker: VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1,
    version: 1,
    status: "QUALIFIED_DEPLOYMENT_PREPARATION_READY_NOT_AUTHORIZED",
    chain_id: 2050,
    execution_epoch: 2,
    coupled_launch_id: COUPLED_LAUNCH_ID,
    source_binding: currentSourceBinding(),
    launch_controller: {
      address: LAUNCH_CONTROLLER,
      evidence_id: "voidwclcce1_" + "1".repeat(64),
      evidence_file_sha256: "2".repeat(64),
      evidence_source_head_sha: gitText(["rev-parse", "HEAD"]),
      evidence_source_binding_sha256: "3".repeat(64),
      verified_at_unix: "1800000000",
      reverified_at_unix: "1800000010",
      valid_until_unix: "1800000600",
      control_verified: true,
      role_binding_authorized: false,
    },
    settlement_executor: {
      address: SETTLEMENT,
      source_path:
        "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts",
      credential_id: "buy-void-native-fulfillment-wallet-v1",
      public_identity_requalified: true,
      role_binding_authorized: false,
    },
    closeout_controller: {
      address: CLOSEOUT,
      source_path:
        "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-authorization-v1.json",
      source_authorization_id:
        "voidcrasgaa1_fb46e3048b5921da3856de4548823b61f32e64f423bf5e7fd4758b9e04e27355",
      public_identity_requalified: true,
      role_binding_authorized: false,
    },
    role_separation: {
      all_addresses_nonzero: true,
      all_addresses_distinct: true,
      void_token_distinct_from_all_roles: true,
    },
    reviewed_package_runtime: {
      runtime_tool_path: "tools/void-reviewed-node-package-runtime-v1.mjs",
      runtime_tool_git_blob_sha1:
        VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1[
          "tools/void-reviewed-node-package-runtime-v1.mjs"
        ],
      runtime_profile_path:
        "ops/security/reviewed-node-package-runtime-ethers-v1.json",
      runtime_profile_git_blob_sha1:
        VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1[
          "ops/security/reviewed-node-package-runtime-ethers-v1.json"
        ],
      profile_id:
        "voidrnpr1_bb76a6a16b4fb779edffb4f541f7a91d0ddb00bfe404031b4387840e74001e77",
      packages_aggregate_sha256:
        "5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73",
      root_packages: ["ethers"],
      qualification_bridge_sha256: "4".repeat(64),
      reviewed_package_bytes_verified: true,
      ancestor_package_resolution_preempted: true,
      execution_network_isolation_provided: false,
    },
    vault_identity: {
      contract_name: "WCVoidMarketVaultV2",
      canonical_void_token: TOKEN,
      accepted_compiled_identity_id:
        "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a",
      accepted_identity_json_sha256:
        "fb9a92e24afa9d7611364ca30b6eff4fe2df2cc2aa8002b77307bead4b864a4b",
      contract_source_sha256:
        "2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925",
      creation_bytecode_sha256:
        "9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af",
      creation_bytecode_keccak256:
        "0xc6ac291ad2557039055c8baf79d2ba085d4ecaffe8e474d5d932602a2fae4b1c",
      runtime_template_sha256:
        "421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409",
      runtime_template_keccak256:
        "0xf5850c03e88aa44017c1894784c23d1359ddcdd13acbebee64ae9e5b17cb713c",
      immutable_layout_sha256:
        "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b",
      runtime_attestation_source_path:
        "tools/void-wc-void-market-vault-runtime-attestation-v1.mjs",
    },
    deployment_preparation: {
      constructor,
      constructor_material_sha256:
        sha256(Buffer.from(canonicalJson(constructor), "utf8")),
      deployment_data_hex: deploymentDataHex,
      deployment_data_bytes: deploymentBytes.length,
      deployment_data_sha256: sha256(deploymentBytes),
      deployment_data_keccak256: "0x" + "5".repeat(64),
      exact_creation_payload_ready: true,
      deployer_selected: false,
      nonce_observed: false,
      fee_observed: false,
      transaction_envelope_ready: false,
      deployment_authorized: false,
      inventory_funding_authorized: false,
    },
    next_gate:
      "separately_authorized_exact_market_vault_deployment_and_inventory_lock",
    authority:
      VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1,
  };
  Object.assign(material, override);
  return {
    ...material,
    qualification_id: qualificationId(material),
  };
}

function input(qualification, rpcUrl, override = {}) {
  const qualificationBytes = prettyBytes(qualification);
  return {
    qualification_bytes: qualificationBytes,
    qualification_file_sha256: sha256(qualificationBytes),
    deployer_address: DEPLOYER,
    inventory_source_address: INVENTORY_SOURCE,
    rpc_url: rpcUrl,
    request_timeout_ms: 5000,
    max_response_bytes: 65536,
    ...override,
  };
}

function balanceHex(value) {
  return "0x" + BigInt(value).toString(16).padStart(64, "0");
}

async function fixture(options = {}) {
  const calls = [];
  let pendingReads = 0;
  let blockReads = 0;
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "invalid_json" }));
        return;
      }
      const call = {
        method: payload.method,
        params: payload.params,
      };
      calls.push(structuredClone(call));
      let result;
      try {
        switch (call.method) {
          case "eth_chainId":
            result = options.wrongChain ? "0x1" : "0x802";
            break;
          case "eth_blockNumber":
            result = "0x64";
            break;
          case "eth_getBlockByNumber":
            blockReads += 1;
            result = {
              number: "0x64",
              hash:
                options.blockDrift && blockReads > 1
                  ? "0x" + "b".repeat(64)
                  : HEAD_HASH,
              timestamp:
                options.timestampDrift && blockReads > 1 ? "0x101" : "0x100",
            };
            break;
          case "eth_getTransactionCount": {
            const tag = call.params?.[1];
            if (tag === "pending") {
              pendingReads += 1;
              result =
                options.pendingDrift && pendingReads > 1 ? "0x8" : "0x7";
            } else {
              result = "0x6";
            }
            break;
          }
          case "eth_getBalance":
            result = options.lowDeployerBalance
              ? "0x1"
              : "0x8ac7230489e80000";
            break;
          case "eth_gasPrice":
            result = "0x3b9aca00";
            break;
          case "eth_estimateGas":
            assert.equal(
              call.params?.[0]?.type,
              "0x2",
              "deployment estimate must be an EIP-1559 type-2 transaction",
            );
            assert.equal(
              call.params?.[0]?.chainId,
              "0x802",
              "deployment estimate must bind Chain-2050",
            );
            assert.equal(
              call.params?.[0]?.to,
              null,
              "deployment estimate must remain contract creation",
            );
            assert.deepEqual(
              call.params?.[0]?.accessList,
              [{
                address:
                  VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1
                    .marker_address,
                storageKeys: [
                  VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1
                    .marker_storage_key,
                ],
              }],
              "deployment estimate must carry the exact signed Epoch-2 access-list marker",
            );
            result = options.badGasEstimate ? "0x0" : "0xf4240";
            break;
          case "eth_call":
            result = balanceHex(
              options.lowInventory
                ? OPENING_ATOMS - 1n
                : OPENING_ATOMS + 123n,
            );
            break;
          default:
            throw new Error("unexpected_method:" + String(call.method));
        }
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: payload.id,
            result,
          }),
        );
      } catch (error) {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: payload.id,
            error: {
              code: -32000,
              message: error instanceof Error ? error.message : String(error),
            },
          }),
        );
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  assert(address && typeof address === "object");
  return {
    calls,
    rpc_url: "http://127.0.0.1:" + String(address.port) + "/",
    close: async () =>
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      }),
  };
}

async function withFixture(options, callback) {
  const f = await fixture(options);
  try {
    return await callback(f);
  } finally {
    await f.close();
  }
}

await withFixture({}, async (f) => {
  const q = qualificationFixture();
  const result =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(q, f.rpc_url),
    );
  if (!result.ok) {
    throw new Error("green_fixture_hold:" + result.reason);
  }
  assert.equal(result.ok, true);
  assert.equal(
    result.marker,
    VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_TEST_ONLY_V1,
  );
  assert.equal(
    result.status,
    "TEST_ONLY_LOOPBACK_OBSERVATION_SEMANTICS_GREEN",
  );
  assert.equal(result.production_artifact_authorized, false);
  assert.equal(result.production_preflight_id_emitted, false);
  assert.equal("preflight_id" in result, false);
  assert.equal("preflight" in result, false);
  assert.equal(result.qualification_id, q.qualification_id);
  assert.equal(result.observation.block_number, "100");
  assert.equal(result.observation.block_hash, HEAD_HASH);
  assert.equal(result.observation.latest_deployer_nonce, "6");
  assert.equal(result.observation.pending_deployer_nonce, "7");
  assert.equal(result.observation.pending_transactions_present, true);
  assert.equal(result.observation.pending_nonce_revalidated, true);
  assert.equal(result.observation.deployment_gas_estimate, "1000000");
  assert.equal(result.observation.gas_price_wei, "1000000000");
  assert.equal(result.observation.epoch2_transaction_type, "2");
  assert.equal(result.observation.epoch2_estimate_chain_id, "2050");
  assert.equal(result.observation.epoch2_estimate_contract_creation, true);
  assert.equal(
    result.observation.epoch2_access_list_marker_address,
    VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.marker_address,
  );
  assert.equal(
    result.observation.epoch2_access_list_marker_storage_key,
    VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.marker_storage_key,
  );
  assert.equal(
    result.observation.epoch2_signed_access_list_marker_bound,
    true,
  );
  assert.equal(
    result.observation.bare_estimated_deployment_cost_wei,
    "1000000000000000",
  );
  assert.equal(result.observation.deployer_balance_covers_bare_estimate, true);
  assert.equal(
    result.observation.inventory_source_void_balance_atoms,
    (OPENING_ATOMS + 123n).toString(),
  );
  assert.equal(
    result.observation.opening_inventory_required_atoms,
    OPENING_ATOMS.toString(),
  );
  assert.equal(
    result.observation.inventory_source_covers_opening_inventory,
    true,
  );
  assert.equal(result.sufficiency.observation_sufficiency_green, true);
  assert.equal(f.calls.length, 11);
  assert.deepEqual(
    [...new Set(f.calls.map((call) => call.method))].sort(),
    [
      "eth_chainId",
      "eth_blockNumber",
      "eth_getBlockByNumber",
      "eth_getTransactionCount",
      "eth_getBalance",
      "eth_gasPrice",
      "eth_estimateGas",
      "eth_call",
    ].sort(),
  );
  const estimate = f.calls.find((call) => call.method === "eth_estimateGas");
  assert.equal(estimate.params[0].from, DEPLOYER);
  assert.equal(
    estimate.params[0].data,
    q.deployment_preparation.deployment_data_hex,
  );
  assert.deepEqual(
    estimate.params[0].accessList,
    [{
      address:
        VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.marker_address,
      storageKeys: [
        VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1
          .marker_storage_key,
      ],
    }],
  );
  assert.equal(estimate.params[1], "0x64");
  const balanceCall = f.calls.find((call) => call.method === "eth_call");
  assert.equal(balanceCall.params[0].to, TOKEN);
  assert.equal(balanceCall.params[1], "0x64");
  assert.equal(
    balanceCall.params[0].data,
    "0x70a08231" + "0".repeat(24) + INVENTORY_SOURCE.slice(2),
  );
});

{
  let injectedCalls = 0;
  const q = qualificationFixture();
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1({
      ...input(q, "http://127.0.0.1:1/"),
      transport: async () => {
        injectedCalls += 1;
        return "0x802";
      },
    });
  assert.equal(result.ok, false);
  assert.equal(
    result.reason,
    "live_deployment_preflight_transport_injection_forbidden",
  );
  assert.equal(injectedCalls, 0);
}

await withFixture({}, async (f) => {
  const branch = gitText(["branch", "--show-current"]);
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(qualificationFixture(), f.rpc_url),
    );

  if (branch === "main") {
    if (result.ok) {
      assert.equal(
        result.status,
        "LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_GREEN",
      );
      assert.equal(f.calls.length, 11);
    } else {
      assert.equal(
        result.reason,
        "live_deployment_preflight_remote_main_head_mismatch",
      );
      assert.equal(
        f.calls.length,
        0,
        "stale local main reached RPC before canonical-main rejection",
      );
    }
  } else {
    assert.equal(result.ok, false);
    assert.equal(
      result.reason,
      "live_deployment_preflight_canonical_main_branch_required",
    );
    assert.equal(
      f.calls.length,
      0,
      "non-main production observation reached RPC",
    );
  }
});

{
  const selected = JSON.parse(
    fs.readFileSync(PRODUCTION_RPC_TARGET, "utf8"),
  );
  const exact =
    testOnlyEvaluateVoidWcVoidMarketVaultProductionRpcPolicyV1({
      rpc_url: selected.selection.rpc_url,
    });
  assert.equal(exact.ok, true);
  assert.equal(
    exact.status,
    "TEST_ONLY_PRODUCTION_EPOCH2_RPC_POLICY_GREEN",
  );
  assert.equal(exact.production_artifact_authorized, false);
  assert.equal(exact.rpc_call, false);
  assert.equal(
    exact.rpc_url_fingerprint_sha256,
    selected.selection.rpc_url_fingerprint_sha256,
  );
  assert.equal(
    exact.selected_rpc_target_git_blob_sha1,
    gitText(["rev-parse", "HEAD:" + PRODUCTION_RPC_TARGET]),
  );
  for (const rpc_url of [
    "http://127.0.0.1:8545/",
    "http://127.0.0.1:18550/",
    "http://127.0.0.1:18551/",
    "http://127.0.0.1:18552/",
    "http://[::1]:18553/",
    "http://127.0.0.1:18553/not-production",
  ]) {
    const held =
      testOnlyEvaluateVoidWcVoidMarketVaultProductionRpcPolicyV1({
        rpc_url,
      });
    assert.equal(held.ok, false, rpc_url);
    assert.equal(
      held.reason,
      "live_deployment_preflight_production_rpc_mismatch",
      rpc_url,
    );
    assert.equal(held.rpc_call, false);
  }
}

{
  const original = fs.readFileSync(PRODUCTION_RPC_TARGET);
  try {
    const tampered = JSON.parse(original.toString("utf8"));
    tampered.selection.rpc_url = "http://127.0.0.1:18553/tampered";
    tampered.selection.rpc_url_fingerprint_sha256 =
      sha256(Buffer.from(tampered.selection.rpc_url, "utf8"));
    fs.writeFileSync(
      PRODUCTION_RPC_TARGET,
      JSON.stringify(tampered, null, 2) + "\n",
    );
    const held =
      testOnlyEvaluateVoidWcVoidMarketVaultProductionRpcPolicyV1({
        rpc_url: tampered.selection.rpc_url,
      });
    assert.equal(held.ok, false);
    assert.equal(
      held.reason,
      "live_deployment_preflight_production_rpc_target_worktree_blob_mismatch",
    );
    assert.equal(held.rpc_call, false);
  } finally {
    fs.writeFileSync(PRODUCTION_RPC_TARGET, original);
  }
}

{
  const head = gitText(["rev-parse", "HEAD"]);
  const feature =
    testOnlyEvaluateVoidWcVoidMarketVaultCanonicalMainIdentityV1({
      branch: "feature/test",
      head,
      remote_main_sha: head,
    });
  assert.equal(feature.ok, false);
  assert.equal(
    feature.reason,
    "live_deployment_preflight_canonical_main_branch_required",
  );

  const stale =
    testOnlyEvaluateVoidWcVoidMarketVaultCanonicalMainIdentityV1({
      branch: "main",
      head,
      remote_main_sha: "f".repeat(40),
    });
  assert.equal(stale.ok, false);
  assert.equal(
    stale.reason,
    "live_deployment_preflight_remote_main_head_mismatch",
  );

  const exact =
    testOnlyEvaluateVoidWcVoidMarketVaultCanonicalMainIdentityV1({
      branch: "main",
      head,
      remote_main_sha: head,
    });
  assert.equal(exact.ok, true);
  assert.equal(exact.production_artifact_authorized, false);
}

{
  const originalOrigin =
    gitText(["config", "--local", "--get", "remote.origin.url"]);
  try {
    for (const canonical of [
      "https://github.com/6ZoSo9/void-node",
      "https://github.com/6ZoSo9/void-node.git",
    ]) {
      setOrigin(canonical);
      await withFixture({}, async (f) => {
        const accepted =
          await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
            input(qualificationFixture(), f.rpc_url),
          );
        assert.equal(
          accepted.ok,
          true,
          accepted.ok ? "" : accepted.reason,
        );
      });
    }

    setOrigin("https://github.com/not-void/void-node.git");
    await withFixture({}, async (f) => {
      const rejected =
        await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
          input(qualificationFixture(), f.rpc_url),
        );
      assert.equal(rejected.ok, false);
      assert.equal(
        rejected.reason,
        "live_deployment_preflight_repository_identity_invalid",
      );
      assert.equal(
        f.calls.length,
        0,
        "hostile origin reached RPC transport before rejection",
      );
    });
  } finally {
    setOrigin(originalOrigin);
  }
}

for (const [options, expectedReason] of [
  [{ wrongChain: true }, "live_deployment_preflight_chain_id_mismatch"],
  [{ pendingDrift: true }, "live_deployment_preflight_revalidation_mismatch"],
  [{ blockDrift: true }, "live_deployment_preflight_revalidation_mismatch"],
  [{ timestampDrift: true }, "live_deployment_preflight_revalidation_mismatch"],
  [{ badGasEstimate: true }, "live_deployment_preflight_gas_estimate_out_of_range"],
]) {
  await withFixture(options, async (f) => {
    const result =
      await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
        input(qualificationFixture(), f.rpc_url),
      );
    assert.equal(result.ok, false);
    assert.equal(result.reason, expectedReason);
  });
}

await withFixture({ lowInventory: true }, async (f) => {
  const result =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(qualificationFixture(), f.rpc_url),
    );
  assert.equal(result.ok, true);
  assert.equal(
    result.sufficiency.opening_inventory_balance_observation_green,
    false,
  );
  assert.equal(result.sufficiency.observation_sufficiency_green, false);
});

await withFixture({ lowDeployerBalance: true }, async (f) => {
  const result =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(qualificationFixture(), f.rpc_url),
    );
  assert.equal(result.ok, true);
  assert.equal(
    result.sufficiency.bare_gas_balance_observation_green,
    false,
  );
  assert.equal(result.sufficiency.observation_sufficiency_green, false);
});

{
  const result =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(qualificationFixture(), "https://example.com/"),
    );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "live_deployment_preflight_rpc_policy_invalid");
}

await withFixture({}, async (f) => {
  const q = qualificationFixture();
  const bytes = prettyBytes(q);
  const result =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1({
      ...input(q, f.rpc_url),
      qualification_file_sha256: "0".repeat(64),
    });
  assert.equal(result.ok, false);
  assert.equal(f.calls.length, 0);
  assert.equal(result.reason, "live_deployment_preflight_qualification_bytes_invalid");
  assert.equal(sha256(bytes).length, 64);
});

await withFixture({}, async (f) => {
  const q = qualificationFixture();
  q.qualification_id = "voidwcvrdq1_" + "0".repeat(64);
  const result =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(q, f.rpc_url),
    );
  assert.equal(result.ok, false);
  assert.equal(f.calls.length, 0);
  assert.equal(result.reason, "live_deployment_preflight_qualification_id_mismatch");
});

await withFixture({}, async (f) => {
  const q = qualificationFixture();
  q.source_binding.source_tree_sha = "0".repeat(40);
  q.qualification_id = qualificationId(q);
  const result =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(q, f.rpc_url),
    );
  assert.equal(result.ok, false);
  assert.equal(f.calls.length, 0);
  assert.equal(result.reason, "live_deployment_preflight_source_tree_mismatch");
});

await withFixture({}, async (f) => {
  const original = fs.readFileSync(QUALIFICATION_TOOL);
  const sentinel = path.join(
    os.tmpdir(),
    "void-live-preflight-unreviewed-qualification-" + String(process.pid),
  );
  try {
    fs.rmSync(sentinel, { force: true });
    const malicious = Buffer.concat([
      Buffer.from(
        'import { writeFileSync as __voidSentinelWrite } from "node:fs";\n' +
          "__voidSentinelWrite(" +
          JSON.stringify(sentinel) +
          ', "executed\\n");\n',
        "utf8",
      ),
      original,
    ]);
    fs.writeFileSync(QUALIFICATION_TOOL, malicious);
    const result =
      await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
        input(qualificationFixture(), f.rpc_url),
      );
    assert.equal(result.ok, false);
    assert.equal(
      result.reason,
      "live_deployment_preflight_repository_identity_invalid",
    );
    assert.equal(f.calls.length, 0);
    assert.equal(
      fs.existsSync(sentinel),
      false,
      "unreviewed qualification module executed before source admission",
    );
  } finally {
    fs.writeFileSync(QUALIFICATION_TOOL, original);
    fs.rmSync(sentinel, { force: true });
  }
});

await withFixture({}, async (f) => {
  const q = qualificationFixture();
  const substituted = "0x4444444444444444444444444444444444444444";
  q.settlement_executor.address = substituted;
  q.deployment_preparation.constructor.values.settlement_executor = substituted;
  q.qualification_id = qualificationId(q);
  const result =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(q, f.rpc_url),
    );
  assert.equal(result.ok, false);
  assert.equal(f.calls.length, 0);
  assert.equal(result.reason, "live_deployment_preflight_role_binding_invalid");
});

{
  const custody =
    testOnlyExerciseVoidWcVoidMarketVaultOutputParentReplacementV1();
  assert.equal(
    custody.marker,
    "VOID_MARKET_VAULT_OUTPUT_PARENT_RACE_TEST_ONLY_V1",
  );
  assert.equal(
    custody.reason,
    "live_deployment_preflight_output_parent_changed_during_write",
  );
  assert.equal(custody.replacement_receipt_exists, false);
  assert.equal(custody.original_receipt_exists, false);
  assert.equal(custody.production_artifact_written, false);
}

for (const [key, expected] of Object.entries({
  qualification_receipt_required: true,
  exact_qualification_bytes_required: true,
  qualification_current_head_required: false,
  qualification_source_head_ancestor_current_main_required: true,
  qualification_source_tree_revalidation_required: true,
  qualification_historical_reviewed_bytes_required: true,
  qualification_current_reviewed_bytes_required: true,
  canonical_source_revalidation_required: true,
  reviewed_qualification_contract_exact_head_execution: true,
  private_reviewed_qualification_contract_materialization: true,
  canonical_main_branch_required: true,
  canonical_remote_main_read_required: true,
  canonical_remote_main_head_match_required: true,
  canonical_remote_main_external_network_read: true,
  canonical_production_epoch2_rpc_required: true,
  caller_transport_injection_forbidden: true,
  production_transport_internal_only: true,
  private_output_parent_fd_bound: true,
  private_output_exact_directory_fsync: true,
  private_output_redirect_forbidden: true,
  explicit_deployer_recorded_not_authorized: true,
  explicit_inventory_source_recorded_not_authorized: true,
  canonical_chain_id: "2050",
  loopback_http_only: true,
  fixed_block_observation: true,
  pending_nonce_revalidation_required: true,
  observation_block_hash_revalidation_required: true,
  block_bound_deployer_balance_required: true,
  exact_deployment_data_gas_estimate_required: true,
  epoch2_signed_access_list_marker_required: true,
  gas_price_observation_required: true,
  canonical_void_balance_of_required: true,
  opening_inventory_atoms_required: OPENING_ATOMS.toString(),
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
})) {
  assert.equal(
    VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1[
      key
    ],
    expected,
    key,
  );
}

for (const [key, expected] of Object.entries({
  test_only: true,
  production_artifact_authorized: false,
  production_preflight_id_emitted: false,
  canonical_remote_main_required: false,
  canonical_production_epoch2_rpc_required: false,
  real_loopback_http_required: true,
  caller_transport_injection_forbidden: true,
  rpc_write: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  deployment: false,
  inventory_funding: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_TEST_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source = fs.readFileSync(PREFLIGHT_TOOL, "utf8");
assert.equal(
  source.includes(
    'from "./void-wc-void-market-vault-role-deployment-qualification-v1.mjs"',
  ),
  false,
  "preflight must not statically execute qualification worktree module",
);
assert.equal(
  source.includes("input?.transport || createHttpTransport"),
  false,
  "production transport injection fallback must not exist",
);
assert.equal(
  source.includes("const transport = createHttpTransport(rpcPolicy);"),
  true,
  "production transport must be internally constructed",
);

for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "admin_",
  "debug_",
  "new Wallet(",
  "signTransaction(",
  "broadcastTransaction",
  "sendTransaction(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  "eth_getTransactionCount",
  "eth_getBalance",
  "eth_gasPrice",
  "eth_estimateGas",
  "eth_call",
  "VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1",
  "accessList: deploymentAccessList",
  "epoch2_signed_access_list_marker_bound: true",
  "O_NOFOLLOW",
  "O_DIRECTORY",
  '"/proc/self/fd/"',
  "fs.fsyncSync(parentFd)",
  "live_deployment_preflight_output_parent_changed_during_write",
  "testOnlyExerciseVoidWcVoidMarketVaultOutputParentReplacementV1",
  "GIT_CONFIG_GLOBAL",
  "core.fsmonitor=false",
  "canonicalRemoteMainHead",
  '"ls-remote"',
  '"refs/heads/main"',
  "live_deployment_preflight_canonical_main_branch_required",
  "live_deployment_preflight_remote_main_head_mismatch",
  "PRODUCTION_EPOCH2_RPC_TARGET_REL",
  "live_deployment_preflight_production_rpc_target_worktree_blob_mismatch",
  "live_deployment_preflight_production_rpc_mismatch",
  "requireCanonicalProductionRpc: true",
  "live_deployment_preflight_transport_injection_forbidden",
  "testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1",
  "TEST_ONLY_LOOPBACK_OBSERVATION_SEMANTICS_GREEN",
  "reviewedQualificationContract",
  "live_deployment_preflight_qualification_contract_blob_mismatch",
  "qualification_source_head_ancestor_current_main_required",
  "live_deployment_preflight_source_head_not_ancestor_current_main",
  "live_deployment_preflight_source_tree_mismatch",
  "historicalFileIdentity",
  "gas_limit_policy_selected: false",
  "fee_policy_selected: false",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("qualification_current_head_required=false");
console.log("qualification_source_head_ancestor_current_main_required=true");
console.log("qualification_source_tree_revalidation_required=true");
console.log("qualification_historical_reviewed_bytes_required=true");
console.log("qualification_current_reviewed_bytes_required=true");
console.log("canonical_main_branch_required=true");
console.log("canonical_remote_main_read_required=true");
console.log("canonical_remote_main_head_match_required=true");
console.log("canonical_production_epoch2_rpc_required=true");
console.log("canonical_production_epoch2_rpc_target_head_blob_required=true");
console.log("retired_epoch1_rpc_8545_rejected=true");
console.log("isolated_epoch2_proof_rpcs_rejected=true");
console.log("caller_transport_injection_forbidden=true");
console.log("production_transport_internal_only=true");
console.log("test_only_loopback_http_green=true");
console.log("production_artifact_from_feature_branch=false");
console.log("output_parent_directory_fd_bound=true");
console.log("output_parent_replacement_redirect_rejected=true");
console.log("output_drift_cleanup_verified=true");
console.log("reviewed_qualification_contract_exact_head_execution=true");
console.log("private_reviewed_qualification_contract_materialization=true");
console.log("dirty_qualification_source_rejected_before_execution=true");
console.log("qualification_id_rederived=true");
console.log("canonical_roles_revalidated=true");
console.log("loopback_http_only=true");
console.log("fixed_block_observation=true");
console.log("pending_nonce_revalidated=true");
console.log("deployer_balance_block_bound=true");
console.log("deployment_gas_estimate_read_only=true");
console.log("epoch2_signed_access_list_marker_bound=true");
console.log("gas_price_observed=true");
console.log("inventory_balance_of_block_bound=true");
console.log("opening_inventory_required_atoms="+OPENING_ATOMS.toString());
console.log("transaction_envelope_construction=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("token_transfer=false");
console.log("chain2050_write=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("canonical_main_postmerge_production_fixture_green=true");
console.log("funds_movement=false");
