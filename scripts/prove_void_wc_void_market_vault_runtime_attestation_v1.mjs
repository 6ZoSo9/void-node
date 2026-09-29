#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import {
  Interface,
} from "ethers";

import {
  EXPECTED as COMPILED_IDENTITY_EXPECTED,
} from "../tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1,
  attestWcVoidMarketVaultRuntimeV1,
  reconstructWcVoidMarketVaultRuntimeV1,
} from "../tools/void-wc-void-market-vault-runtime-attestation-v1.mjs";

const acceptance = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json",
    "utf8",
  ),
);
const stateManifest = JSON.parse(
  fs.readFileSync(
    "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
    "utf8",
  ),
);
const canonicalVoidToken =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const canonicalVoidTokenRuntimeSha256 =
  "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb";
const canonicalTokenAccount = stateManifest.accounts.find(
  (row) => String(row.address).toLowerCase() === canonicalVoidToken,
);
assert(canonicalTokenAccount);
assert.equal(canonicalTokenAccount.label, "VoidEpoch2TokenV1");
const canonicalTokenRuntime = String(
  canonicalTokenAccount.runtime_code_hex,
).toLowerCase();
assert.match(canonicalTokenRuntime, /^0x(?:[0-9a-f]{2})+$/u);
assert.equal(
  (canonicalTokenRuntime.length - 2) / 2,
  4597,
);
assert.equal(
  createHash("sha256")
    .update(Buffer.from(canonicalTokenRuntime.slice(2), "hex"))
    .digest("hex"),
  canonicalVoidTokenRuntimeSha256,
);
assert.equal(
  canonicalTokenAccount.runtime_sha256,
  canonicalVoidTokenRuntimeSha256,
);

const VAULT = new Interface([
  "function voidToken() view returns (address)",
  "function launchController() view returns (address)",
  "function settlementExecutor() view returns (address)",
  "function closeoutController() view returns (address)",
  "function coupledLaunchId() view returns (bytes32)",
  "function openingInventoryAtoms() view returns (uint256)",
  "function currentVoidReserveAtoms() view returns (uint256)",
  "function activated() view returns (bool)",
  "function closing() view returns (bool)",
  "function closed() view returns (bool)",
  "function closeoutApproved() view returns (bool)",
  "function activatedAtBlock() view returns (uint256)",
  "function settlementCount() view returns (uint256)",
  "function lifetimeVoidOutAtoms() view returns (uint256)",
  "function pendingCloseoutId() view returns (bytes32)",
  "function pendingSuccessorVault() view returns (address)",
]);
const TOKEN = new Interface([
  "function balanceOf(address) view returns (uint256)",
]);

const openingInventory = 10_000_000n * 10n ** 18n;
const deployment = Object.freeze({
  market_vault_address:
    "0x1111111111111111111111111111111111111111",
  deployment_transaction_hash:
    "0x" + "a".repeat(64),
  deployment_deployer:
    "0x2222222222222222222222222222222222222222",
  void_token: canonicalVoidToken,
  launch_controller:
    "0x4444444444444444444444444444444444444444",
  settlement_executor:
    "0x5555555555555555555555555555555555555555",
  closeout_controller:
    "0x6666666666666666666666666666666666666666",
  coupled_launch_id:
    "0x" + "7".repeat(64),
});

const reconstructed =
  reconstructWcVoidMarketVaultRuntimeV1(
    acceptance,
    deployment,
  );
assert.equal(
  reconstructed.runtime_bytes,
  COMPILED_IDENTITY_EXPECTED.runtime_template_bytes,
);
assert.match(reconstructed.runtime_sha256, /^[0-9a-f]{64}$/);
assert.match(
  reconstructed.runtime_keccak256,
  /^0x[0-9a-f]{64}$/,
);

const deploymentBlockHash = "0x" + "8".repeat(64);
const headBlockHash = "0x" + "9".repeat(64);

function receipt(overrides = {}) {
  return {
    transactionHash: deployment.deployment_transaction_hash,
    from: deployment.deployment_deployer,
    to: null,
    contractAddress: deployment.market_vault_address,
    status: "0x1",
    blockNumber: "0x64",
    blockHash: deploymentBlockHash,
    ...overrides,
  };
}

function vaultValues(overrides = {}) {
  return {
    voidToken: deployment.void_token,
    launchController: deployment.launch_controller,
    settlementExecutor: deployment.settlement_executor,
    closeoutController: deployment.closeout_controller,
    coupledLaunchId: deployment.coupled_launch_id,
    openingInventoryAtoms: openingInventory,
    currentVoidReserveAtoms: openingInventory,
    activated: false,
    closing: false,
    closed: false,
    closeoutApproved: false,
    activatedAtBlock: 0n,
    settlementCount: 0n,
    lifetimeVoidOutAtoms: 0n,
    pendingCloseoutId: "0x" + "00".repeat(32),
    pendingSuccessorVault:
      "0x0000000000000000000000000000000000000000",
    tokenBalance: openingInventory,
    ...overrides,
  };
}

function transportFor({
  chainId = "0x802",
  deploymentReceipt = receipt(),
  secondDeploymentReceipt = deploymentReceipt,
  head = "0x78",
  firstHeadHash = headBlockHash,
  secondHeadHash = firstHeadHash,
  runtime = reconstructed.runtime_hex,
  tokenRuntime = canonicalTokenRuntime,
  values = vaultValues(),
} = {}) {
  const calls = [];
  let receiptReads = 0;
  let headBlockReads = 0;
  const transport = async ({ method, params }) => {
    calls.push({ method, params });
    if (method === "eth_chainId") return chainId;
    if (method === "eth_getTransactionReceipt") {
      return receiptReads++ === 0
        ? deploymentReceipt
        : secondDeploymentReceipt;
    }
    if (method === "eth_blockNumber") return head;
    if (method === "eth_getBlockByNumber") {
      const requested = String(params?.[0] || "").toLowerCase();
      if (requested === "0x64") {
        return {
          number: "0x64",
          hash: deploymentBlockHash,
        };
      }
      return {
        number: head,
        hash: headBlockReads++ === 0
          ? firstHeadHash
          : secondHeadHash,
      };
    }
    if (method === "eth_getCode") {
      const address = String(params?.[0] || "").toLowerCase();
      if (address === deployment.market_vault_address) return runtime;
      if (address === deployment.void_token) return tokenRuntime;
      throw new Error("unexpected_code_address");
    }
    if (method === "eth_call") {
      const call = params?.[0] || {};
      const to = String(call.to || "").toLowerCase();
      const data = String(call.data || "");
      if (to === deployment.void_token) {
        const parsed = TOKEN.parseTransaction({ data });
        assert.equal(parsed?.name, "balanceOf");
        return TOKEN.encodeFunctionResult(
          "balanceOf",
          [values.tokenBalance],
        );
      }
      assert.equal(to, deployment.market_vault_address);
      const parsed = VAULT.parseTransaction({ data });
      assert(parsed);
      return VAULT.encodeFunctionResult(
        parsed.name,
        [values[parsed.name]],
      );
    }
    throw new Error("unexpected_method:" + method);
  };
  return { calls, transport };
}

async function rejects(options, code) {
  let thrown = null;
  try {
    await attestWcVoidMarketVaultRuntimeV1({
      compiled_identity_acceptance: acceptance,
      deployment: options.deployment ?? deployment,
      min_confirmations: "3",
      transport: options.transport,
    });
  } catch (error) {
    thrown = error;
  }
  assert(thrown, "expected rejection: " + code);
  assert.equal(thrown.message, code);
}

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1,
  "VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1",
);

const happyTransport = transportFor();
const green = await attestWcVoidMarketVaultRuntimeV1({
  compiled_identity_acceptance: acceptance,
  deployment,
  min_confirmations: "3",
  transport: happyTransport.transport,
});
assert.equal(green.ok, true);
assert.equal(
  green.status,
  "RUNTIME_ATTESTED_PREACTIVATION_INVENTORY_LOCKED",
);
assert.match(green.evidence_id, /^voidwcmvre1_[0-9a-f]{64}$/);
assert.equal(
  green.compiled_identity_packet_id,
  COMPILED_IDENTITY_EXPECTED.packet_id,
);
assert.equal(
  green.compiled_identity_id,
  COMPILED_IDENTITY_EXPECTED.identity_id,
);
assert.equal(
  green.deployment_transaction_hash,
  deployment.deployment_transaction_hash,
);
assert.equal(green.deployment_block_number, "100");
assert.equal(green.deployment_receipt_revalidated, true);
assert.equal(green.observed_head_block_number, "120");
assert.equal(green.observed_confirmation_count, "21");
assert.equal(
  green.market_vault_address,
  deployment.market_vault_address,
);
assert.equal(
  green.runtime_code_sha256,
  reconstructed.runtime_sha256,
);
assert.equal(
  green.runtime_code_keccak256,
  reconstructed.runtime_keccak256,
);
assert.equal(green.void_token, canonicalVoidToken);
assert.equal(
  green.void_token_runtime_code_sha256,
  canonicalVoidTokenRuntimeSha256,
);
assert.equal(green.canonical_void_token_verified, true);
assert.equal(green.canonical_void_token_runtime_verified, true);
assert.equal(
  green.launch_controller,
  deployment.launch_controller,
);
assert.equal(
  green.settlement_executor,
  deployment.settlement_executor,
);
assert.equal(
  green.closeout_controller,
  deployment.closeout_controller,
);
assert.equal(
  green.coupled_launch_id,
  deployment.coupled_launch_id,
);
assert.equal(
  green.opening_inventory_atoms,
  openingInventory.toString(),
);
assert.equal(
  green.current_void_reserve_atoms,
  openingInventory.toString(),
);
assert.equal(
  green.token_balance_atoms,
  openingInventory.toString(),
);
assert.equal(green.activated, false);
assert.equal(green.settlement_count, "0");
assert.equal(green.deployment_attested, true);
assert.equal(green.final_role_bindings_attested, true);
assert.equal(green.deployed_runtime_code_observed, true);
assert.equal(green.market_vault_independently_verified, true);
assert.equal(green.inventory_funded, true);
assert.equal(green.inventory_lock_proven, true);
assert.equal(green.market_activation_authorized, false);
assert.equal(green.public_presale_activation_authorized, false);
assert.equal(green.funds_movement_authorized, false);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_AUTHORITY_V1,
)) {
  if (
    key === "read_only_rpc_verification" ||
    key === "injected_transport_required"
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

{
  const t = transportFor();
  await rejects(
    {
      transport: t.transport,
      deployment: {
        ...deployment,
        void_token:
          "0x3333333333333333333333333333333333333333",
      },
    },
    "WC_VOID_MARKET_VAULT_NONCANONICAL_VOID_TOKEN",
  );
  assert.equal(t.calls.length, 0);
}
{
  const mutatedTokenRuntime =
    canonicalTokenRuntime.slice(0, 2) +
    (canonicalTokenRuntime.slice(2, 4) === "00" ? "01" : "00") +
    canonicalTokenRuntime.slice(4);
  const t = transportFor({ tokenRuntime: mutatedTokenRuntime });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_TOKEN_RUNTIME_CODE_MISMATCH",
  );
}

{
  const t = transportFor({ chainId: "0x1" });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_CHAIN_ID_MISMATCH",
  );
}
{
  const t = transportFor({
    deploymentReceipt: receipt({
      contractAddress:
        "0x7777777777777777777777777777777777777777",
    }),
  });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_DEPLOYMENT_RECEIPT_MISMATCH",
  );
}
{
  const t = transportFor();
  const original = t.transport;
  const transport = async (request) => {
    if (
      request.method === "eth_getBlockByNumber" &&
      String(request.params?.[0] || "").toLowerCase() === "0x64"
    ) {
      return {
        number: "0x64",
        hash: "0x" + "c".repeat(64),
      };
    }
    return await original(request);
  };
  await rejects(
    { transport },
    "WC_VOID_MARKET_VAULT_DEPLOYMENT_BLOCK_HASH_MISMATCH",
  );
}
{
  const t = transportFor({ head: "0x65" });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_CONFIRMATIONS_INSUFFICIENT",
  );
}
{
  const mutated =
    reconstructed.runtime_hex.slice(0, 2) +
    (reconstructed.runtime_hex.slice(2, 4) === "00" ? "01" : "00") +
    reconstructed.runtime_hex.slice(4);
  const t = transportFor({ runtime: mutated });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_RUNTIME_CODE_MISMATCH",
  );
}
{
  const t = transportFor({
    values: vaultValues({
      settlementExecutor:
        "0x7777777777777777777777777777777777777777",
    }),
  });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_IMMUTABLE_GETTER_MISMATCH",
  );
}
{
  const t = transportFor({
    values: vaultValues({
      currentVoidReserveAtoms: openingInventory - 1n,
      tokenBalance: openingInventory - 1n,
    }),
  });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_OPENING_INVENTORY_NOT_EXACT",
  );
}
{
  const t = transportFor({
    values: vaultValues({ activated: true }),
  });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_PREACTIVATION_LOCK_STATE_INVALID",
  );
}
{
  const t = transportFor({
    values: vaultValues({ settlementCount: 1n }),
  });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_PREACTIVATION_LOCK_STATE_INVALID",
  );
}
{
  const t = transportFor({
    secondDeploymentReceipt: receipt({
      blockHash: "0x" + "d".repeat(64),
    }),
  });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_DEPLOYMENT_RECEIPT_CHANGED",
  );
}
{
  const t = transportFor({
    secondHeadHash: "0x" + "c".repeat(64),
  });
  await rejects(
    t,
    "WC_VOID_MARKET_VAULT_HEAD_BLOCK_CHANGED_DURING_ATTESTATION",
  );
}
{
  const badAcceptance = structuredClone(acceptance);
  badAcceptance.accepted_identity.identity_json_sha256 =
    "0".repeat(64);
  const t = transportFor();
  await assert.rejects(
    () => attestWcVoidMarketVaultRuntimeV1({
      compiled_identity_acceptance: badAcceptance,
      deployment,
      min_confirmations: "3",
      transport: t.transport,
    }),
    /WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_NOT_ACCEPTED/,
  );
}

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-runtime-attestation-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "systemctl",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
assert.match(source, /eth_getTransactionReceipt/);
assert.match(source, /eth_getCode/);
assert.match(source, /eth_call/);
assert.match(source, /eth_getBlockByNumber/);
assert.match(source, /verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1/);
assert.match(source, /CANONICAL_VOID_TOKEN/);
assert.match(source, /CANONICAL_VOID_TOKEN_RUNTIME_SHA256/);
assert.match(source, /TOKEN_RUNTIME_CODE_MISMATCH/);
assert.match(source, /HEAD_BLOCK_CHANGED_DURING_ATTESTATION/);

console.log("VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1_PROOF_GREEN");
console.log("synthetic_transport_only=true");
console.log("compiled_identity_reverified=true");
console.log("runtime_reconstructed_from_exact_immutable_layout=true");
console.log("deployment_receipt_bound=true");
console.log("deployment_block_canonical_hash_verified=true");
console.log("deployment_receipt_revalidated=true");
console.log("stable_finalized_block_required=true");
console.log("immutable_role_getters_verified=true");
console.log("canonical_void_token_address_verified=true");
console.log("canonical_void_token_runtime_verified=true");
console.log("opening_inventory_exact_10m_void=true");
console.log("token_balance_matches_vault_reserve=true");
console.log("preactivation_lock_state_verified=true");
console.log("market_vault_independently_verified_source_path=true");
console.log("inventory_funding_verification_source_path=true");
console.log("inventory_lock_proof_source_path=true");
console.log("production_candidate_updated=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
