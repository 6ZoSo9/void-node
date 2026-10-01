#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1,
} from "../tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1,
  observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1,
} from "../tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs";

const QUALIFICATION_TOOL =
  "tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";
const PREFLIGHT_TOOL =
  "tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs";
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

function input(qualification, transport, override = {}) {
  const qualificationBytes = prettyBytes(qualification);
  return {
    qualification_bytes: qualificationBytes,
    qualification_file_sha256: sha256(qualificationBytes),
    deployer_address: DEPLOYER,
    inventory_source_address: INVENTORY_SOURCE,
    rpc_url: "http://127.0.0.1:8545/",
    request_timeout_ms: 5000,
    max_response_bytes: 65536,
    transport,
    ...override,
  };
}

function balanceHex(value) {
  return "0x" + BigInt(value).toString(16).padStart(64, "0");
}

function fixture(options = {}) {
  const calls = [];
  let pendingReads = 0;
  let blockReads = 0;
  const transport = async (call) => {
    calls.push(structuredClone(call));
    switch (call.method) {
      case "eth_chainId":
        return options.wrongChain ? "0x1" : "0x802";
      case "eth_blockNumber":
        return "0x64";
      case "eth_getBlockByNumber":
        blockReads += 1;
        return {
          number: "0x64",
          hash:
            options.blockDrift && blockReads > 1
              ? "0x" + "b".repeat(64)
              : HEAD_HASH,
          timestamp:
            options.timestampDrift && blockReads > 1 ? "0x101" : "0x100",
        };
      case "eth_getTransactionCount": {
        const tag = call.params?.[1];
        if (tag === "pending") {
          pendingReads += 1;
          if (options.pendingDrift && pendingReads > 1) return "0x8";
          return "0x7";
        }
        return "0x6";
      }
      case "eth_getBalance":
        return options.lowDeployerBalance ? "0x1" : "0x8ac7230489e80000";
      case "eth_gasPrice":
        return "0x3b9aca00";
      case "eth_estimateGas":
        return options.badGasEstimate ? "0x0" : "0xf4240";
      case "eth_call":
        return balanceHex(
          options.lowInventory
            ? OPENING_ATOMS - 1n
            : OPENING_ATOMS + 123n,
        );
      default:
        throw new Error("unexpected_method:" + call.method);
    }
  };
  return { calls, transport };
}

{
  const q = qualificationFixture();
  const f = fixture();
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(q, f.transport),
    );
  if (!result.ok) {
    throw new Error("green_fixture_hold:" + result.reason);
  }
  assert.equal(result.ok, true);
  const preflight = result.preflight;
  assert.equal(
    preflight.marker,
    VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1,
  );
  assert.equal(
    preflight.status,
    "LIVE_DEPLOYMENT_OBSERVATION_COMPLETE_NOT_AUTHORIZED",
  );
  assert.match(preflight.preflight_id, /^voidwcmvldop1_[0-9a-f]{64}$/u);
  assert.equal(preflight.qualification.qualification_id, q.qualification_id);
  assert.equal(preflight.operator_selections.deployer_address, DEPLOYER);
  assert.equal(
    preflight.operator_selections.inventory_source_address,
    INVENTORY_SOURCE,
  );
  assert.equal(preflight.observation.block_number, "100");
  assert.equal(preflight.observation.block_hash, HEAD_HASH);
  assert.equal(preflight.observation.latest_deployer_nonce, "6");
  assert.equal(preflight.observation.pending_deployer_nonce, "7");
  assert.equal(preflight.observation.pending_transactions_present, true);
  assert.equal(preflight.observation.pending_nonce_revalidated, true);
  assert.equal(preflight.observation.deployment_gas_estimate, "1000000");
  assert.equal(preflight.observation.gas_price_wei, "1000000000");
  assert.equal(
    preflight.observation.bare_estimated_deployment_cost_wei,
    "1000000000000000",
  );
  assert.equal(preflight.observation.deployer_balance_covers_bare_estimate, true);
  assert.equal(
    preflight.observation.inventory_source_void_balance_atoms,
    (OPENING_ATOMS + 123n).toString(),
  );
  assert.equal(
    preflight.observation.opening_inventory_required_atoms,
    OPENING_ATOMS.toString(),
  );
  assert.equal(
    preflight.observation.inventory_source_covers_opening_inventory,
    true,
  );
  assert.equal(preflight.sufficiency.observation_sufficiency_green, true);
  assert.equal(
    preflight.next_gate,
    "separately_review_gas_limit_fee_policy_nonce_use_and_deployment_authority",
  );
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
  assert.equal(estimate.params[1], "0x64");
  const balanceCall = f.calls.find((call) => call.method === "eth_call");
  assert.equal(balanceCall.params[0].to, TOKEN);
  assert.equal(balanceCall.params[1], "0x64");
  assert.equal(
    balanceCall.params[0].data,
    "0x70a08231" + "0".repeat(24) + INVENTORY_SOURCE.slice(2),
  );
}

{
  const originalOrigin =
    gitText(["config", "--local", "--get", "remote.origin.url"]);
  try {
    setOrigin("https://github.com/6ZoSo9/void-node.git");
    const acceptedFixture = fixture();
    const accepted =
      await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
        input(qualificationFixture(), acceptedFixture.transport),
      );
    assert.equal(
      accepted.ok,
      true,
      accepted.ok ? "" : accepted.reason,
    );

    setOrigin("https://github.com/not-void/void-node.git");
    const hostileFixture = fixture();
    const rejected =
      await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
        input(qualificationFixture(), hostileFixture.transport),
      );
    assert.equal(rejected.ok, false);
    if (rejected.ok) throw new Error("hostile origin unexpectedly accepted");
    assert.equal(
      rejected.reason,
      "live_deployment_preflight_repository_identity_invalid",
    );
    assert.equal(
      hostileFixture.calls.length,
      0,
      "hostile origin reached RPC transport before rejection",
    );
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
  const f = fixture(options);
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(qualificationFixture(), f.transport),
    );
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("negative fixture unexpectedly green");
  assert.equal(result.reason, expectedReason);
}

{
  const f = fixture({ lowInventory: true });
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(qualificationFixture(), f.transport),
    );
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.reason);
  assert.equal(
    result.preflight.sufficiency.opening_inventory_balance_observation_green,
    false,
  );
  assert.equal(result.preflight.sufficiency.observation_sufficiency_green, false);
  assert.equal(
    result.preflight.next_gate,
    "resolve_observed_balance_shortfall_then_repeat_preflight",
  );
}

{
  const f = fixture({ lowDeployerBalance: true });
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(qualificationFixture(), f.transport),
    );
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.reason);
  assert.equal(
    result.preflight.sufficiency.bare_gas_balance_observation_green,
    false,
  );
  assert.equal(result.preflight.sufficiency.observation_sufficiency_green, false);
}

{
  const f = fixture();
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(qualificationFixture(), f.transport, {
        rpc_url: "https://example.com/",
      }),
    );
  assert.equal(result.ok, false);
  assert.equal(f.calls.length, 0);
  assert.equal(result.reason, "live_deployment_preflight_rpc_policy_invalid");
}

{
  const q = qualificationFixture();
  const f = fixture();
  const bytes = prettyBytes(q);
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1({
      ...input(q, f.transport),
      qualification_file_sha256: "0".repeat(64),
    });
  assert.equal(result.ok, false);
  assert.equal(f.calls.length, 0);
  assert.equal(result.reason, "live_deployment_preflight_qualification_bytes_invalid");
  assert.equal(sha256(bytes).length, 64);
}

{
  const q = qualificationFixture();
  q.qualification_id = "voidwcvrdq1_" + "0".repeat(64);
  const f = fixture();
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(q, f.transport),
    );
  assert.equal(result.ok, false);
  assert.equal(f.calls.length, 0);
  assert.equal(result.reason, "live_deployment_preflight_qualification_id_mismatch");
}

{
  const q = qualificationFixture();
  q.source_binding.source_head_sha = "0".repeat(40);
  q.qualification_id = qualificationId(q);
  const f = fixture();
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(q, f.transport),
    );
  assert.equal(result.ok, false);
  assert.equal(f.calls.length, 0);
  assert.equal(result.reason, "live_deployment_preflight_source_generation_mismatch");
}

{
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
    const f = fixture();
    const result =
      await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
        input(qualificationFixture(), f.transport),
      );
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("dirty qualification source unexpectedly green");
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
}

{
  const q = qualificationFixture();
  const substituted = "0x4444444444444444444444444444444444444444";
  q.settlement_executor.address = substituted;
  q.deployment_preparation.constructor.values.settlement_executor = substituted;
  q.qualification_id = qualificationId(q);
  const f = fixture();
  const result =
    await observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(q, f.transport),
    );
  assert.equal(result.ok, false);
  assert.equal(f.calls.length, 0);
  assert.equal(result.reason, "live_deployment_preflight_role_binding_invalid");
}

for (const [key, expected] of Object.entries({
  qualification_receipt_required: true,
  exact_qualification_bytes_required: true,
  qualification_current_head_required: true,
  canonical_source_revalidation_required: true,
  reviewed_qualification_contract_exact_head_execution: true,
  private_reviewed_qualification_contract_materialization: true,
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

const source = fs.readFileSync(PREFLIGHT_TOOL, "utf8");
assert.equal(
  source.includes(
    'from "./void-wc-void-market-vault-role-deployment-qualification-v1.mjs"',
  ),
  false,
  "preflight must not statically execute qualification worktree module",
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
  "O_NOFOLLOW",
  "GIT_CONFIG_GLOBAL",
  "core.fsmonitor=false",
  "reviewedQualificationContract",
  "live_deployment_preflight_qualification_contract_blob_mismatch",
  "qualification_current_head_required",
  "gas_limit_policy_selected: false",
  "fee_policy_selected: false",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("qualification_current_head_required=true");
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
console.log("funds_movement=false");
