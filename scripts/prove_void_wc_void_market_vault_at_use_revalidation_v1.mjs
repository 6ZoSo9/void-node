#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { Interface } from "ethers";

import {
  EXPECTED as COMPILED_IDENTITY_EXPECTED,
  loadWcVoidMarketVaultCompiledIdentityCurrentV2,
} from "../tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs";
import {
  reconstructWcVoidMarketVaultRuntimeV1,
} from "../tools/void-wc-void-market-vault-runtime-attestation-v1.mjs";
import {
  VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_OPENING_ID_V1,
  VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_VAULT_ID_V1,
  VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_AGE_SECONDS_V1,
  VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1,
  collectWcVoidMarketVaultAtUseRevalidationV1,
  verifyWcVoidMarketVaultAtUseRevalidationV1,
} from "../tools/void-wc-void-market-vault-at-use-revalidation-v1.mjs";

const acceptance=loadWcVoidMarketVaultCompiledIdentityCurrentV2();
const stateManifest=JSON.parse(fs.readFileSync(
  "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
  "utf8",
));

const voidToken="0x470075b85352eb86f7d089fb9ba88945f12aad94";
const tokenAccount=stateManifest.accounts.find(
  (row)=>String(row.address).toLowerCase()===voidToken,
);
assert(tokenAccount);
const tokenRuntime=String(tokenAccount.runtime_code_hex).toLowerCase();
assert.equal(
  createHash("sha256")
    .update(Buffer.from(tokenRuntime.slice(2),"hex"))
    .digest("hex"),
  "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb",
);

const VAULT=new Interface([
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
const TOKEN=new Interface(["function balanceOf(address) view returns (uint256)"]);

const openingInventory=10_000_000n*10n**18n;
const deployment=Object.freeze({
  market_vault_address:"0x1111111111111111111111111111111111111111",
  deployment_transaction_hash:"0x"+"a".repeat(64),
  deployment_deployer:"0x2222222222222222222222222222222222222222",
  void_token:voidToken,
  launch_controller:"0x4444444444444444444444444444444444444444",
  settlement_executor:"0x5555555555555555555555555555555555555555",
  closeout_controller:"0x6666666666666666666666666666666666666666",
  coupled_launch_id:VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_VAULT_ID_V1,
});
const runtime=reconstructWcVoidMarketVaultRuntimeV1(acceptance,deployment);
const deploymentBlockHash="0x"+"8".repeat(64);
const headBlockHash="0x"+"9".repeat(64);

function hex(value) {
  return "0x"+BigInt(value).toString(16);
}

function receipt(overrides={}) {
  return {
    transactionHash:deployment.deployment_transaction_hash,
    from:deployment.deployment_deployer,
    to:null,
    contractAddress:deployment.market_vault_address,
    status:"0x1",
    blockNumber:"0x64",
    blockHash:deploymentBlockHash,
    ...overrides,
  };
}

function vaultValues(overrides={}) {
  return {
    voidToken:deployment.void_token,
    launchController:deployment.launch_controller,
    settlementExecutor:deployment.settlement_executor,
    closeoutController:deployment.closeout_controller,
    coupledLaunchId:deployment.coupled_launch_id,
    openingInventoryAtoms:openingInventory,
    currentVoidReserveAtoms:openingInventory,
    activated:false,
    closing:false,
    closed:false,
    closeoutApproved:false,
    activatedAtBlock:0n,
    settlementCount:0n,
    lifetimeVoidOutAtoms:0n,
    pendingCloseoutId:"0x"+"00".repeat(32),
    pendingSuccessorVault:"0x0000000000000000000000000000000000000000",
    tokenBalance:openingInventory,
    ...overrides,
  };
}

function transportFor({
  headTimestampSeconds=BigInt(Math.floor(Date.now()/1000)-5),
  secondHeadTimestampSeconds=headTimestampSeconds,
  omitHeadTimestamp=false,
  values=vaultValues(),
}={}) {
  let receiptReads=0;
  let headReads=0;
  const calls=[];
  const transport=async ({method,params})=>{
    calls.push({method,params});
    if(method==="eth_chainId") return "0x802";
    if(method==="eth_getTransactionReceipt") {
      receiptReads+=1;
      return receipt();
    }
    if(method==="eth_blockNumber") return "0x78";
    if(method==="eth_getBlockByNumber") {
      const requested=String(params?.[0]||"").toLowerCase();
      if(requested==="0x64") {
        return {
          number:"0x64",
          hash:deploymentBlockHash,
          timestamp:hex(headTimestampSeconds-100n),
        };
      }
      const timestamp=headReads++===0
        ?headTimestampSeconds
        :secondHeadTimestampSeconds;
      const out={
        number:"0x78",
        hash:headBlockHash,
      };
      if(!omitHeadTimestamp) out.timestamp=hex(timestamp);
      return out;
    }
    if(method==="eth_getCode") {
      const address=String(params?.[0]||"").toLowerCase();
      if(address===deployment.market_vault_address) return runtime.runtime_hex;
      if(address===deployment.void_token) return tokenRuntime;
      throw new Error("unexpected_code_address");
    }
    if(method==="eth_call") {
      const call=params?.[0]||{};
      const to=String(call.to||"").toLowerCase();
      const data=String(call.data||"");
      if(to===deployment.void_token) {
        const parsed=TOKEN.parseTransaction({data});
        assert.equal(parsed?.name,"balanceOf");
        return TOKEN.encodeFunctionResult("balanceOf",[values.tokenBalance]);
      }
      assert.equal(to,deployment.market_vault_address);
      const parsed=VAULT.parseTransaction({data});
      assert(parsed);
      return VAULT.encodeFunctionResult(parsed.name,[values[parsed.name]]);
    }
    throw new Error("unexpected_method:"+method);
  };
  return {calls,transport};
}

async function collect(options={}) {
  const t=transportFor(options);
  const artifact=await collectWcVoidMarketVaultAtUseRevalidationV1({
    compiled_identity_acceptance:acceptance,
    deployment,
    min_confirmations:"3",
    transport:t.transport,
  });
  return {artifact,calls:t.calls};
}

async function rejectsCollect(options,code) {
  let thrown=null;
  try {
    await collect(options);
  } catch(error) {
    thrown=error;
  }
  assert(thrown,"expected collection rejection: "+code);
  assert.equal(thrown.message,code);
}

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1,
  "VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1",
);
assert.equal(
  VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_OPENING_ID_V1,
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
assert.equal(
  VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_VAULT_ID_V1,
  "0xb893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
assert.equal(VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_AGE_SECONDS_V1,600);

const {artifact,calls}=await collect();
assert.equal(
  artifact.status,
  "MARKET_VAULT_PREACTIVATION_AT_USE_REVALIDATED_FRESH",
);
assert.equal(artifact.chain_id,2050);
assert.equal(artifact.execution_epoch,2);
assert.equal(artifact.pair,"WC_VOID");
assert.equal(
  artifact.opening_domain_coupled_launch_id,
  VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_OPENING_ID_V1,
);
assert.equal(
  artifact.vault_coupled_launch_id,
  VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_VAULT_ID_V1,
);
assert.equal(artifact.compiled_identity_id,COMPILED_IDENTITY_EXPECTED.identity_id);
assert.equal(
  artifact.compiled_identity_acceptance.accepted_identity.identity_id,
  COMPILED_IDENTITY_EXPECTED.identity_id,
);
assert.equal(artifact.market_vault_address,deployment.market_vault_address);
assert.equal(artifact.market_vault_runtime_code_sha256,runtime.runtime_sha256);
assert.equal(artifact.observed_head_block_number,"120");
assert.equal(artifact.observed_head_block_hash,headBlockHash);
assert.equal(artifact.observed_confirmation_count,"21");
assert.match(artifact.runtime_attestation_evidence_id,/^voidwcmvre1_[0-9a-f]{64}$/u);
assert.match(artifact.runtime_attestation_import_id,/^voidwcmvri1_[0-9a-f]{64}$/u);
assert.match(artifact.runtime_attestation_binding_id,/^voidwcmvrb1_[0-9a-f]{64}$/u);
assert.match(artifact.at_use_evidence_sha256,/^sha256:[0-9a-f]{64}$/u);
assert.equal(
  artifact.market_vault_runtime_verification_evidence_id,
  artifact.at_use_evidence_sha256,
);
assert.equal(artifact.inventory_lock_evidence_id,artifact.at_use_evidence_sha256);
assert.match(artifact.revalidation_id,/^voidwcmvau1_[0-9a-f]{64}$/u);
assert.equal(artifact.market_vault_independently_verified,true);
assert.equal(artifact.inventory_funded,true);
assert.equal(artifact.inventory_lock_proven,true);
assert.equal(artifact.preactivation_state_verified,true);
assert.equal(artifact.fresh_at_collection,true);
assert.equal(artifact.production_candidate_updated,false);
assert.equal(artifact.market_activation_authorized,false);
assert.equal(artifact.public_presale_activation_authorized,false);
assert.equal(artifact.funds_movement_authorized,false);
assert.equal(
  calls.some((row)=>row.method==="eth_sendRawTransaction"),
  false,
);
assert.equal(calls.some((row)=>row.method==="eth_sendTransaction"),false);

const verified=verifyWcVoidMarketVaultAtUseRevalidationV1({
  artifact,
  evaluation_time_utc:artifact.collection_completed_at_utc,
});
assert.equal(verified.ok,true);
assert.equal(
  verified.status,
  "MARKET_VAULT_AT_USE_EVIDENCE_VERIFIED_CURRENT",
);
assert.equal(verified.evidence_current_at_evaluation,true);
assert.equal(
  verified.market_vault_runtime_verification_evidence_id,
  artifact.at_use_evidence_sha256,
);
assert.equal(verified.inventory_lock_evidence_id,artifact.at_use_evidence_sha256);
assert.equal(verified.production_candidate_binding_allowed,false);
assert.equal(verified.market_activation_authorized,false);
assert.equal(verified.public_presale_activation_authorized,false);
assert.equal(verified.funds_movement_authorized,false);

{
  const extra={
    compiled_identity_acceptance:acceptance,
    deployment,
    min_confirmations:"3",
    transport:transportFor().transport,
    observed_at_utc:"2030-01-01T00:00:00Z",
  };
  await assert.rejects(
    ()=>collectWcVoidMarketVaultAtUseRevalidationV1(extra),
    /INVALID_WC_VOID_MARKET_VAULT_AT_USE_COLLECTION_INPUT_SHAPE/u,
  );
}

await rejectsCollect(
  {
    headTimestampSeconds:
      BigInt(Math.floor(Date.now()/1000))
      -BigInt(VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_AGE_SECONDS_V1)
      -2n,
  },
  "AT_USE_HEAD_TIMESTAMP_STALE_AT_COLLECTION",
);

await rejectsCollect(
  {
    headTimestampSeconds:BigInt(Math.floor(Date.now()/1000))+60n,
  },
  "AT_USE_HEAD_TIMESTAMP_TOO_FAR_IN_FUTURE",
);

{
  const now=BigInt(Math.floor(Date.now()/1000)-5);
  await rejectsCollect(
    {
      headTimestampSeconds:now,
      secondHeadTimestampSeconds:now+1n,
    },
    "AT_USE_HEAD_TIMESTAMP_CHANGED_DURING_COLLECTION",
  );
}

await rejectsCollect(
  {omitHeadTimestamp:true},
  "AT_USE_BLOCK_TIMESTAMP_MISSING",
);

await rejectsCollect(
  {values:vaultValues({settlementCount:1n})},
  "WC_VOID_MARKET_VAULT_PREACTIVATION_LOCK_STATE_INVALID",
);

{
  const bad=structuredClone(artifact);
  bad.compiled_identity_acceptance.accepted_identity.identity_json_sha256=
    "0".repeat(64);
  assert.throws(
    ()=>verifyWcVoidMarketVaultAtUseRevalidationV1({
      artifact:bad,
      evaluation_time_utc:bad.collection_completed_at_utc,
    }),
    /WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_NOT_ACCEPTED/u,
  );
}

{
  const bad=structuredClone(artifact);
  bad.at_use_evidence_sha256="sha256:"+"f".repeat(64);
  assert.throws(
    ()=>verifyWcVoidMarketVaultAtUseRevalidationV1({
      artifact:bad,
      evaluation_time_utc:bad.collection_completed_at_utc,
    }),
    /AT_USE_ARTIFACT_CONTENT_ID_MISMATCH/u,
  );
}

{
  const after=new Date(
    Date.parse(artifact.valid_until_utc)+1000,
  ).toISOString().replace(".000Z","Z");
  assert.throws(
    ()=>verifyWcVoidMarketVaultAtUseRevalidationV1({
      artifact,
      evaluation_time_utc:after,
    }),
    /AT_USE_EVIDENCE_NOT_CURRENT/u,
  );
}

for(const [key,value] of Object.entries(
  VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_AUTHORITY_V1,
)) {
  const allowed=new Set([
    "read_only_rpc_collection",
    "injected_transport_required",
    "collector_wall_clock_read",
    "chain_head_timestamp_bound",
    "source_only_reverification",
  ]);
  assert.equal(value,allowed.has(key),key);
}

const source=fs.readFileSync(
  "tools/void-wc-void-market-vault-at-use-revalidation-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden),false,forbidden);
}
assert.match(source,/Date\.now\(\)/u);
assert.doesNotMatch(source,/evaluation_time_utc.*collectWcVoid/u);
assert.match(source,/head_block_timestamp_utc/u);
assert.match(source,/AT_USE_HEAD_TIMESTAMP_STALE_AT_COLLECTION/u);
assert.match(source,/importWcVoidMarketVaultRuntimeAttestationV1/u);
assert.match(source,/reconstructWcVoidMarketVaultRuntimeV1/u);
assert.match(source,/AT_USE_DEPLOYED_RUNTIME_RECONSTRUCTION_MISMATCH/u);
assert.match(source,/attestWcVoidMarketVaultRuntimeV1/u);

console.log("VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1_PROOF_GREEN");
console.log("caller_supplied_collection_time=false");
console.log("collector_wall_clock_recorded=true");
console.log("chain_head_timestamp_bound=true");
console.log("old_head_recollection_cannot_extend_validity=true");
console.log("runtime_attestation_semantically_reimported=true");
console.log("market_vault_runtime_verification_evidence_id_ready=true");
console.log("inventory_lock_evidence_id_ready=true");
console.log("production_candidate_binding_allowed=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
