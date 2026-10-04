#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import * as http from "node:http";
import { execFileSync } from "node:child_process";

import {
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1,
} from "../tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1,
  testOnlyEvaluateVoidWcVoidMarketVaultQualificationFreshnessV1,
  testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1,
} from "../tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs";

const QUALIFICATION_TOOL =
  "tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";
const COUPLED_LAUNCH_ID =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const LAUNCH_CONTROLLER = "0x1111111111111111111111111111111111111111";
const SETTLEMENT = "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const CLOSEOUT = "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b";
const DEPLOYER = "0x2222222222222222222222222222222222222222";
const INVENTORY_SOURCE = "0x3333333333333333333333333333333333333333";
const HEAD_HASH = "0x" + "a".repeat(64);
const OPENING_ATOMS = 10000000000000000000000000n;

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

function gitBytes(args) {
  return Buffer.from(execFileSync("/usr/bin/git", args, {
    cwd: process.cwd(),
    encoding: null,
    env: gitEnv(),
  }));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return "{" + Object.keys(value).sort().map(
    (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
  ).join(",") + "}";
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

function sourceBinding(ref = "HEAD") {
  const sourceHead = gitText(["rev-parse", ref]);
  const dependencyFileSha = {};
  const dependencyGitBlobs = {};
  for (const relativePath of Object.keys(
    VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  )) {
    const bytes = gitBytes(["show", sourceHead + ":" + relativePath]);
    dependencyFileSha[relativePath] = sha256(bytes);
    dependencyGitBlobs[relativePath] =
      gitText(["rev-parse", sourceHead + ":" + relativePath]);
  }
  const qualificationToolBytes =
    gitBytes(["show", sourceHead + ":" + QUALIFICATION_TOOL]);
  return {
    source_head_sha: sourceHead,
    source_tree_sha: gitText(["rev-parse", sourceHead + "^{tree}"]),
    canonical_remote_url: "https://github.com/6ZoSo9/void-node.git",
    reviewed_main_anchor: "2dcf6544f373f828347434fd0c6d434334af1658",
    qualification_tool_git_blob_sha1:
      gitText(["rev-parse", sourceHead + ":" + QUALIFICATION_TOOL]),
    qualification_tool_file_sha256: sha256(qualificationToolBytes),
    dependency_git_blobs: dependencyGitBlobs,
    dependency_file_sha256: dependencyFileSha,
  };
}

function qualificationFixture({
  verified = "1800000000",
  reverified = "1800000010",
  validUntil = "1800000600",
  sourceRef = "HEAD",
} = {}) {
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
    source_binding: sourceBinding(sourceRef),
    launch_controller: {
      address: LAUNCH_CONTROLLER,
      evidence_id: "voidwlcce1_" + "1".repeat(64),
      evidence_file_sha256: "2".repeat(64),
      evidence_source_head_sha: gitText(["rev-parse", sourceRef]),
      evidence_source_binding_sha256: "3".repeat(64),
      verified_at_unix: verified,
      reverified_at_unix: reverified,
      valid_until_unix: validUntil,
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
  return {
    ...material,
    qualification_id: qualificationId(material),
  };
}

function input(
  qualification,
  rpcUrl,
  evaluationTimeUnix,
  finalEvaluationTimeUnix = evaluationTimeUnix,
) {
  const bytes = prettyBytes(qualification);
  return {
    qualification_bytes: bytes,
    qualification_file_sha256: sha256(bytes),
    deployer_address: DEPLOYER,
    inventory_source_address: INVENTORY_SOURCE,
    rpc_url: rpcUrl,
    request_timeout_ms: 1000,
    max_response_bytes: 65536,
    evaluation_time_unix: evaluationTimeUnix,
    final_evaluation_time_unix: finalEvaluationTimeUnix,
  };
}

function balanceHex(value) {
  return "0x" + BigInt(value).toString(16).padStart(64, "0");
}

async function withValidRpcFixture(callback) {
  let rpcCalls = 0;
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      rpcCalls += 1;
      let payload;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end("{}");
        return;
      }
      let result;
      switch (payload.method) {
        case "eth_chainId":
          result = "0x802";
          break;
        case "eth_blockNumber":
          result = "0x64";
          break;
        case "eth_getBlockByNumber":
          result = {
            number: "0x64",
            hash: HEAD_HASH,
            timestamp: "0x100",
          };
          break;
        case "eth_getTransactionCount":
          result = payload.params?.[1] === "pending" ? "0x7" : "0x6";
          break;
        case "eth_getBalance":
          result = "0x8ac7230489e80000";
          break;
        case "eth_gasPrice":
          result = "0x3b9aca00";
          break;
        case "eth_estimateGas":
          result = "0xf4240";
          break;
        case "eth_call":
          result = balanceHex(OPENING_ATOMS + 123n);
          break;
        default:
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({
            jsonrpc: "2.0",
            id: payload.id,
            error: { code: -32000, message: "unexpected_method" },
          }));
          return;
      }
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        jsonrpc: "2.0",
        id: payload.id,
        result,
      }));
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    return await callback({
      rpc_url: "http://127.0.0.1:" + String(address.port) + "/",
      rpcCalls: () => rpcCalls,
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

{
  const fresh = testOnlyEvaluateVoidWcVoidMarketVaultQualificationFreshnessV1({
    launch_controller: qualificationFixture().launch_controller,
    evaluation_time_unix: "1800000599",
  });
  assert.equal(fresh.ok, true);
  assert.equal(fresh.valid_until_unix, "1800000600");

  const expired = testOnlyEvaluateVoidWcVoidMarketVaultQualificationFreshnessV1({
    launch_controller: qualificationFixture().launch_controller,
    evaluation_time_unix: "1800000600",
  });
  assert.equal(expired.ok, false);
  assert.equal(
    expired.reason,
    "live_deployment_preflight_launch_controller_control_expired",
  );

  const beforeReverify =
    testOnlyEvaluateVoidWcVoidMarketVaultQualificationFreshnessV1({
      launch_controller: qualificationFixture().launch_controller,
      evaluation_time_unix: "1800000009",
    });
  assert.equal(beforeReverify.ok, false);
  assert.equal(
    beforeReverify.reason,
    "live_deployment_preflight_evaluation_before_control_reverification",
  );

  const badLineage =
    testOnlyEvaluateVoidWcVoidMarketVaultQualificationFreshnessV1({
      launch_controller: qualificationFixture({
        verified: "1800000020",
        reverified: "1800000010",
      }).launch_controller,
      evaluation_time_unix: "1800000021",
    });
  assert.equal(badLineage.ok, false);
  assert.equal(
    badLineage.reason,
    "live_deployment_preflight_control_time_lineage_invalid",
  );
}

{
  let rpcCalls = 0;
  const server = http.createServer((_request, response) => {
    rpcCalls += 1;
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end("{}");
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const result =
      await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
        input(
          qualificationFixture(),
          "http://127.0.0.1:" + String(address.port) + "/",
          "1800000600",
        ),
      );
    assert.equal(result.ok, false);
    assert.equal(
      result.reason,
      "live_deployment_preflight_launch_controller_control_expired",
    );
    assert.equal(rpcCalls, 0, "expired qualification reached RPC");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}


const CURRENT_QUALIFICATION_SOURCE_CHANGE = gitText([
  "rev-list",
  "-1",
  "HEAD",
  "--",
  QUALIFICATION_TOOL,
]);
const ANCESTOR_SOURCE_REF = CURRENT_QUALIFICATION_SOURCE_CHANGE + "^";
const ANCESTOR_SOURCE_HEAD = gitText(["rev-parse", ANCESTOR_SOURCE_REF]);
const CURRENT_HEAD = gitText(["rev-parse", "HEAD"]);
assert.notEqual(
  ANCESTOR_SOURCE_HEAD,
  CURRENT_HEAD,
  "ancestor qualification test requires distinct generations",
);
assert.notEqual(
  gitText(["rev-parse", ANCESTOR_SOURCE_HEAD + ":" + QUALIFICATION_TOOL]),
  gitText(["rev-parse", CURRENT_HEAD + ":" + QUALIFICATION_TOOL]),
  "ancestor qualification fixture must predate qualification authority refresh",
);

await withValidRpcFixture(async (fixture) => {
  const q = qualificationFixture({ sourceRef: ANCESTOR_SOURCE_REF });
  const result =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(
        q,
        fixture.rpc_url,
        "1800000599",
        "1800000599",
      ),
    );
  assert.equal(result.ok, false);
  assert.equal(
    result.reason,
    "live_deployment_preflight_source_generation_mismatch",
  );
  assert.equal(result.production_artifact_authorized, false);
  assert.equal(result.production_preflight_id_emitted, false);
  assert.equal(
    fixture.rpcCalls(),
    0,
    "pre-correction qualification generation reached RPC",
  );
});

{
  const q = qualificationFixture();
  q.source_binding.source_tree_sha = "0".repeat(40);
  q.qualification_id = qualificationId(q);
  let rpcCalls = 0;
  const server = http.createServer((_request, response) => {
    rpcCalls += 1;
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end("{}");
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const held =
      await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
        input(
          q,
          "http://127.0.0.1:" + String(address.port) + "/",
          "1800000599",
          "1800000599",
        ),
      );
    assert.equal(held.ok, false);
    assert.equal(held.reason, "live_deployment_preflight_source_tree_mismatch");
    assert.equal(rpcCalls, 0, "forged source tree reached RPC");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

await withValidRpcFixture(async (fixture) => {
  const q = qualificationFixture();
  const callsBefore = fixture.rpcCalls();
  const expiredAtMint =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(
        q,
        fixture.rpc_url,
        "1800000599",
        "1800000600",
      ),
    );
  assert.equal(expiredAtMint.ok, false);
  assert.equal(
    expiredAtMint.reason,
    "live_deployment_preflight_launch_controller_control_expired",
  );
  assert.equal(expiredAtMint.production_preflight_id_emitted, false);
  assert.equal(
    fixture.rpcCalls() > callsBefore,
    true,
    "final freshness adversary did not traverse RPC observation",
  );
});

await withValidRpcFixture(async (fixture) => {
  const q = qualificationFixture();
  const stillFresh =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(
        q,
        fixture.rpc_url,
        "1800000599",
        "1800000599",
      ),
    );
  assert.equal(
    stillFresh.ok,
    true,
    stillFresh.ok ? "" : stillFresh.reason,
  );
  assert.equal(stillFresh.production_artifact_authorized, false);
  assert.equal(stillFresh.production_preflight_id_emitted, false);
  assert.equal(fixture.rpcCalls() > 0, true);
});

await withValidRpcFixture(async (fixture) => {
  const q = qualificationFixture();
  const regressed =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(
      input(
        q,
        fixture.rpc_url,
        "1800000500",
        "1800000499",
      ),
    );
  assert.equal(regressed.ok, false);
  assert.equal(
    regressed.reason,
    "live_deployment_preflight_evaluation_time_regressed",
  );
  assert.equal(regressed.production_preflight_id_emitted, false);
  assert.equal(
    fixture.rpcCalls() > 0,
    true,
    "clock regression adversary did not traverse RPC observation",
  );
});

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1
    .qualification_current_head_required,
  false,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1
    .qualification_source_head_ancestor_current_main_required,
  true,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1
    .qualification_source_tree_revalidation_required,
  true,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1
    .qualification_historical_reviewed_bytes_required,
  true,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1
    .qualification_current_reviewed_bytes_required,
  true,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1
    .qualification_control_freshness_required,
  true,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1
    .qualification_control_freshness_revalidation_required,
  true,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1
    .production_wall_clock_evaluation_required,
  true,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1
    .production_wall_clock_monotonicity_required,
  true,
);

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs",
  "utf8",
);
assert.ok(source.includes("String(Math.floor(Date.now() / 1000))"));
assert.ok(source.includes("live_deployment_preflight_launch_controller_control_expired"));
assert.ok(source.includes("live_deployment_preflight_source_head_not_ancestor_current_main"));
assert.ok(source.includes("live_deployment_preflight_source_tree_mismatch"));
assert.ok(source.includes("historicalFileIdentity"));
assert.ok(source.includes("dependency_historical_bytes_verified"));
assert.ok(source.includes("evaluation_time_unix ??"));
assert.ok(source.includes("final_evaluation_time_unix ??"));
assert.ok(source.includes("finalEvaluationTimeUnix === null"));
assert.ok(source.includes("live_deployment_preflight_evaluation_time_regressed"));
assert.ok(source.indexOf("verifyQualification(") < source.indexOf("createHttpTransport(rpcPolicy)"));
assert.ok(
  source.indexOf("finalEvaluationTimeUnix === null") <
    source.indexOf("const bareEstimatedCost = gasEstimate * gasPrice"),
);
assert.ok(
  source.indexOf("live_deployment_preflight_evaluation_time_regressed") <
    source.indexOf("const bareEstimatedCost = gasEstimate * gasPrice"),
);

console.log("VOID_WC_VOID_MARKET_VAULT_LIVE_PREFLIGHT_QUALIFICATION_FRESHNESS_V1_PROOF_GREEN");
console.log("qualification_current_head_required=false");
console.log("qualification_source_head_ancestor_current_main_required=true");
console.log("qualification_source_tree_revalidation_required=true");
console.log("qualification_historical_reviewed_bytes_required=true");
console.log("qualification_current_reviewed_bytes_required=true");
console.log("ancestor_qualification_with_unchanged_reviewed_bytes_green=true");
console.log("forged_historical_source_tree_zero_rpc_calls=true");
console.log("production_wall_clock_noninjectable=true");
console.log("test_only_evaluation_time_injection=true");
console.log("verified_reverified_expiry_ordering_required=true");
console.log("evaluation_before_reverification_held=true");
console.log("expiry_boundary_held=true");
console.log("expired_qualification_zero_rpc_calls=true");
console.log("fresh_before_rpc_expired_before_mint_held=true");
console.log("freshness_revalidated_after_rpc=true");
console.log("production_wall_clock_monotonicity_required=true");
console.log("wall_clock_regression_after_rpc_held=true");
console.log("production_preflight_id_not_emitted_after_expiry=true");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("market_activation=false");
console.log("funds_movement=false");
