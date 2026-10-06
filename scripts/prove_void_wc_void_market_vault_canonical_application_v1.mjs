#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Interface } from "ethers";

import {
  EXPECTED as COMPILED_IDENTITY_EXPECTED,
  loadWcVoidMarketVaultCompiledIdentityCurrentV2,
} from "../tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs";
import {
  reconstructWcVoidMarketVaultRuntimeV1,
} from "../tools/void-wc-void-market-vault-runtime-attestation-v1.mjs";
import {
  VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_VAULT_ID_V1,
  collectWcVoidMarketVaultAtUseRevalidationV1,
} from "../tools/void-wc-void-market-vault-at-use-revalidation-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_PLAN_V1,
  VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_REVIEWED_BLOBS_V1,
  prepareVoidWcVoidMarketVaultCanonicalApplicationV1,
  verifyVoidWcVoidMarketVaultCanonicalApplicationStateV1,
  verifyVoidWcVoidMarketVaultCanonicalApplicationV1,
} from "../tools/void-wc-void-market-vault-canonical-application-v1.mjs";

const PRODUCTION="ops/mainnet0/wc-void-production-candidate-v1.json";
const AT_USE_TOOL=
  "tools/void-wc-void-market-vault-at-use-revalidation-v1.mjs";
const REVIEWED_RUNTIME_PROFILE=JSON.parse(fs.readFileSync(
  "ops/security/reviewed-node-package-runtime-ethers-v1.json",
  "utf8",
));

function sha256(value){
  return createHash("sha256").update(value).digest("hex");
}
function prettyBytes(value){
  return Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
}

function safeLocalGit(args){
  return spawnSync(
    "/usr/bin/git",
    [
      "--no-replace-objects",
      "-c","core.fsmonitor=false",
      "-c","core.hooksPath=/dev/null",
      "-c","core.attributesFile=/dev/null",
      "-c","core.untrackedCache=false",
      "-c","core.preloadIndex=false",
      "-c","submodule.recurse=false",
      "-C",process.cwd(),
      ...args,
    ],
    {
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      env:{
        PATH:"/usr/bin:/bin",
        LANG:"C",
        LC_ALL:"C",
        HOME:"/nonexistent",
        XDG_CONFIG_HOME:"/nonexistent",
        GIT_CONFIG_GLOBAL:"/dev/null",
        GIT_CONFIG_SYSTEM:"/dev/null",
        GIT_CONFIG_NOSYSTEM:"1",
        GIT_ATTR_NOSYSTEM:"1",
        GIT_NO_REPLACE_OBJECTS:"1",
        GIT_OPTIONAL_LOCKS:"0",
      },
    },
  );
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"){
    return "{"+Object.keys(value).sort().map(
      key=>JSON.stringify(key)+":"+canonical(value[key]),
    ).join(",")+"}";
  }
  throw new Error("invalid canonical value");
}
function hex(value){return "0x"+BigInt(value).toString(16);}
function applicationPlanId(value){
  const copy=structuredClone(value);
  delete copy.application_plan_id;
  return "voidwcmvcap1_"+
    sha256(Buffer.from(canonical(copy),"utf8"));
}

const acceptance=loadWcVoidMarketVaultCompiledIdentityCurrentV2();
const stateManifest=JSON.parse(fs.readFileSync(
  "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
  "utf8",
));
const voidToken="0x470075b85352eb86f7d089fb9ba88945f12aad94";
const tokenAccount=stateManifest.accounts.find(
  row=>String(row.address).toLowerCase()===voidToken,
);
assert(tokenAccount);
const tokenRuntime=String(tokenAccount.runtime_code_hex).toLowerCase();
assert.equal(
  sha256(Buffer.from(tokenRuntime.slice(2),"hex")),
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

function receipt(){
  return {
    transactionHash:deployment.deployment_transaction_hash,
    from:deployment.deployment_deployer,
    to:null,
    contractAddress:deployment.market_vault_address,
    status:"0x1",
    blockNumber:"0x64",
    blockHash:deploymentBlockHash,
  };
}
function vaultValues(overrides={}){
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
  values=vaultValues(),
}={}){
  let headReads=0;
  const transport=async ({method,params})=>{
    if(method==="eth_chainId")return "0x802";
    if(method==="eth_getTransactionReceipt")return receipt();
    if(method==="eth_blockNumber")return "0x78";
    if(method==="eth_getBlockByNumber"){
      const requested=String(params?.[0]||"").toLowerCase();
      if(requested==="0x64"){
        return {
          number:"0x64",
          hash:deploymentBlockHash,
          timestamp:hex(headTimestampSeconds-100n),
        };
      }
      headReads+=1;
      return {
        number:"0x78",
        hash:headBlockHash,
        timestamp:hex(headTimestampSeconds),
      };
    }
    if(method==="eth_getCode"){
      const address=String(params?.[0]||"").toLowerCase();
      if(address===deployment.market_vault_address)return runtime.runtime_hex;
      if(address===deployment.void_token)return tokenRuntime;
      throw new Error("unexpected_code_address");
    }
    if(method==="eth_call"){
      const call=params?.[0]||{};
      const to=String(call.to||"").toLowerCase();
      const data=String(call.data||"");
      if(to===deployment.void_token){
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
  return transport;
}

async function artifactFor(options={}){
  return await collectWcVoidMarketVaultAtUseRevalidationV1({
    compiled_identity_acceptance:acceptance,
    deployment,
    min_confirmations:"3",
    transport:transportFor(options),
  });
}

const sourceBytes=fs.readFileSync(PRODUCTION);
const sourceCandidate=JSON.parse(sourceBytes.toString("utf8"));
assert.equal(sourceCandidate.status,"hold");
assert.equal(sourceCandidate.market_vault_address,null);
assert.equal(sourceCandidate.market_vault_runtime_code_sha256,null);
assert.equal(sourceCandidate.market_vault_independently_verified,false);
assert.equal(sourceCandidate.inventory_funded,false);
assert.equal(sourceCandidate.inventory_lock_proven,false);
assert.equal(sourceCandidate.coupled_activation_ready,false);

const artifact=await artifactFor();
const artifactBytes=prettyBytes(artifact);
const plan=await prepareVoidWcVoidMarketVaultCanonicalApplicationV1({
  at_use_artifact_bytes:artifactBytes,
  at_use_artifact_file_sha256:sha256(artifactBytes),
});

assert.equal(
  plan.marker,
  VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_PLAN_V1,
);
assert.equal(plan.status,"MARKET_VAULT_CANONICAL_APPLICATION_PREPARED");
assert.match(plan.application_plan_id,/^voidwcmvcap1_[0-9a-f]{64}$/u);
assert.equal(plan.market_vault_address,deployment.market_vault_address);
assert.equal(plan.market_vault_runtime_code_sha256,runtime.runtime_sha256);
assert.equal(plan.market_vault_independently_verified,true);
assert.equal(plan.inventory_funded,true);
assert.equal(plan.inventory_lock_proven,true);
assert.equal(plan.production_status_remains_hold,true);
assert.equal(plan.coupled_activation_ready,false);
assert.equal(plan.evidence_fresh_at_reviewed_collection,true);
assert.equal(plan.application_time_authority,false);
assert.equal(plan.canonical_production_candidate_updated,false);
assert.equal(plan.candidate_application_required,true);
assert.equal(plan.market_activation_authorized,false);
assert.equal(plan.public_presale_activation_authorized,false);
assert.equal(plan.funds_movement_authorized,false);
assert.equal(
  plan.reviewed_node_package_runtime_profile_id,
  REVIEWED_RUNTIME_PROFILE.profile_id,
);
assert.equal(
  plan.reviewed_node_package_runtime_packages_aggregate_sha256,
  REVIEWED_RUNTIME_PROFILE.packages_aggregate_sha256,
);
assert.equal(plan.reviewed_execution_permission_fenced,true);
assert.equal(
  plan.reviewed_execution_ancestor_package_resolution_allowed,
  false,
);
assert.equal(plan.reviewed_execution_network_isolation_provided,false);
assert.match(
  plan.reviewed_node_package_runtime_tool_git_blob_sha1,
  /^[0-9a-f]{40}$/u,
);
assert.match(
  plan.reviewed_node_package_runtime_profile_git_blob_sha1,
  /^[0-9a-f]{40}$/u,
);
assert.match(
  plan.reviewed_execution_bridge_git_blob_sha1,
  /^[0-9a-f]{40}$/u,
);
assert.deepEqual(
  plan.promoted_production_fields,
  [
    "market_vault_address",
    "market_vault_runtime_code_sha256",
    "market_vault_independently_verified",
    "inventory_funded",
    "inventory_lock_proven",
  ],
);

assert.equal(plan.production_target_candidate.market_vault_address,deployment.market_vault_address);
assert.equal(
  plan.production_target_candidate.market_vault_runtime_code_sha256,
  runtime.runtime_sha256,
);
assert.equal(plan.production_target_candidate.market_vault_independently_verified,true);
assert.equal(plan.production_target_candidate.inventory_funded,true);
assert.equal(plan.production_target_candidate.inventory_lock_proven,true);
assert.equal(plan.production_target_candidate.status,"hold");
assert.equal(plan.production_target_candidate.bounded_canary_green,sourceCandidate.bounded_canary_green);
assert.equal(plan.production_target_candidate.coupled_activation_ready,false);
assert.deepEqual(
  plan.production_target_candidate.market_vault_compiled_identity_acceptance,
  sourceCandidate.market_vault_compiled_identity_acceptance,
);

const reset=structuredClone(plan.production_target_candidate);
reset.market_vault_address=null;
reset.market_vault_runtime_code_sha256=null;
reset.market_vault_independently_verified=false;
reset.inventory_funded=false;
reset.inventory_lock_proven=false;
assert.equal(canonical(reset),canonical(sourceCandidate));

const removed=[
  "market_vault_address_required",
  "market_vault_runtime_code_sha256_required",
  "market_vault_independent_verification_required",
  "inventory_funding_required",
  "inventory_lock_proof_required",
];
for(const gate of removed){
  assert.equal(plan.production_before.missing_gates.includes(gate),true,gate);
  assert.equal(plan.production_after.missing_gates.includes(gate),false,gate);
}
assert.deepEqual(
  plan.production_after.missing_gates,
  plan.production_before.missing_gates.filter(gate=>!removed.includes(gate)),
);
assert.equal(plan.production_before.status,"HOLD");
assert.equal(plan.production_after.status,"HOLD");
assert.equal(
  plan.production_after.missing_gates.includes("bounded_canary_required"),
  plan.production_before.missing_gates.includes("bounded_canary_required"),
);
assert.equal(
  plan.production_after.missing_gates.includes("coupled_activation_ready_required"),
  true,
);

assert.equal(Object.isFrozen(plan),true);
assert.equal(Object.isFrozen(plan.production_target_candidate),true);
assert.equal(Object.isFrozen(plan.production_target_candidate.authority),true);
assert.throws(
  ()=>{ plan.production_target_candidate.coupled_activation_ready=true; },
  TypeError,
);

const state=await verifyVoidWcVoidMarketVaultCanonicalApplicationStateV1({
  plan,
  productionCandidate:plan.production_target_candidate,
});
assert.equal(state.ok,true);
assert.equal(
  state.status,
  "MARKET_VAULT_CANONICAL_APPLICATION_STATE_VERIFIED_FINAL_ACTIVATION_HOLD",
);
assert.equal(state.coupled_activation_ready,false);

{
  const forged=structuredClone(plan);
  forged.reviewed_source_blobs[
    "tools/void-wc-void-market-vault-reviewed-runtime-bridge-v1.mjs"
  ]="0".repeat(40);
  forged.application_plan_id=applicationPlanId(forged);
  await assert.rejects(
    ()=>verifyVoidWcVoidMarketVaultCanonicalApplicationStateV1({
      plan:forged,
      productionCandidate:plan.production_target_candidate,
    }),
    /MARKET_VAULT_CANONICAL_REVIEWED_SOURCE_MANIFEST_MISMATCH/u,
  );
}

for(const [key,value] of Object.entries(
  VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_AUTHORITY_V1,
)){
  const allowed=new Set([
    "source_only_application",
    "exact_at_use_artifact_bytes_required",
    "at_use_semantic_reverification_required",
    "evidence_fresh_at_collection_required",
    "canonical_head_candidate_required",
    "git_config_isolated",
    "reviewed_execution_source_required",
    "verified_modules_loaded_from_exact_git_objects",
    "ephemeral_verified_module_materialization",
    "reviewed_package_runtime_required",
    "reviewed_package_bytes_verified",
    "private_reviewed_package_materialization",
    "permission_fenced_reviewed_execution",
    "ancestor_package_resolution_forbidden",
    "ambient_node_resolution_overrides_ignored",
    "ambient_dynamic_loader_overrides_ignored",
    "exact_five_field_source_delta",
    "canonical_classifier_reexecution",
    "canonical_main_application_required",
    "canonical_remote_main_read_required",
    "external_network_read",
    "filesystem_read",
    "filesystem_write",
  ]);
  assert.equal(value,allowed.has(key),key);
}

assert.deepEqual(
  Object.keys(VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_REVIEWED_BLOBS_V1)
    .sort(),
  [
    "ops/security/reviewed-node-package-runtime-ethers-v1.json",
    "package-lock.json",
    "package.json",
    "tools/void-reviewed-node-package-runtime-v1.mjs",
    "tools/void-wc-void-coupled-opening-v1.mjs",
    "tools/void-wc-void-market-vault-at-use-revalidation-v1.mjs",
    "tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs",
    "tools/void-wc-void-market-vault-compiler-identity-v1.mjs",
    "tools/void-wc-void-market-vault-runtime-attestation-import-v1.mjs",
    "tools/void-wc-void-market-vault-runtime-attestation-v1.mjs",
    "tools/void-wc-void-market-vault-reviewed-runtime-bridge-v1.mjs",
    "tools/void-wc-void-opening-settlement-adapter-review-v1.mjs",
    "tools/void-wc-void-production-readiness-v1.mjs",
  ].sort(),
);

{
  await assert.rejects(
    ()=>prepareVoidWcVoidMarketVaultCanonicalApplicationV1({
      at_use_artifact_bytes:artifactBytes,
      at_use_artifact_file_sha256:"0".repeat(64),
    }),
    /MARKET_VAULT_CANONICAL_AT_USE_ARTIFACT_SHA256_MISMATCH/u,
  );
}

{
  const bad=structuredClone(artifact);
  bad.inventory_lock_proven=false;
  const bytes=prettyBytes(bad);
  await assert.rejects(
    ()=>prepareVoidWcVoidMarketVaultCanonicalApplicationV1({
      at_use_artifact_bytes:bytes,
      at_use_artifact_file_sha256:sha256(bytes),
    }),
    /AT_USE_REQUIRED_VERIFICATION_MISSING|AT_USE_ARTIFACT_CONTENT_ID_MISMATCH|MARKET_VAULT_CANONICAL_EVIDENCE_INVALID/u,
  );
}

{
  const hostile=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-market-vault-canonical-git-hostile-"),
  );
  const home=path.join(hostile,"home");
  const fsmonitor=path.join(hostile,"fake-fsmonitor.sh");
  const attributes=path.join(hostile,"attributes");
  const sentinel=path.join(hostile,"fsmonitor-invoked");
  fs.mkdirSync(home,{recursive:true});
  fs.writeFileSync(
    fsmonitor,
    "#!/bin/sh\nprintf 'invoked\\n' >> "+JSON.stringify(sentinel)+"\nexit 92\n",
    {mode:0o755},
  );
  fs.writeFileSync(attributes,"* export-ignore\n","utf8");
  fs.writeFileSync(
    path.join(home,".gitconfig"),
    [
      "[core]",
      "  fsmonitor = "+fsmonitor,
      "  attributesFile = "+attributes,
      "",
    ].join("\n"),
    "utf8",
  );

  const prior=new Map();
  for(const key of ["core.fsmonitor","core.attributesFile"]){
    const got=safeLocalGit(["config","--local","--no-includes","--get-all",key]);
    prior.set(
      key,
      got.status===0
        ? String(got.stdout||"").split("\n").filter(Boolean)
        : [],
    );
  }

  const saved=new Map();
  for(const key of [
    "HOME","XDG_CONFIG_HOME","GIT_DIR","GIT_WORK_TREE",
    "GIT_OBJECT_DIRECTORY","GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_CONFIG_COUNT","GIT_CONFIG_KEY_0","GIT_CONFIG_VALUE_0",
    "GIT_EXEC_PATH",
  ]){
    saved.set(
      key,
      Object.prototype.hasOwnProperty.call(process.env,key)
        ? process.env[key]
        : undefined,
    );
  }

  try{
    let set=safeLocalGit([
      "config","--local","--no-includes","--replace-all",
      "core.attributesFile",attributes,
    ]);
    assert.equal(set.status,0,String(set.stderr||""));
    set=safeLocalGit([
      "config","--local","--no-includes","--replace-all",
      "core.fsmonitor",fsmonitor,
    ]);
    assert.equal(set.status,0,String(set.stderr||""));
    assert.equal(fs.existsSync(sentinel),false);

    process.env.HOME=home;
    process.env.XDG_CONFIG_HOME=home;
    process.env.GIT_DIR=path.join(hostile,"forged.git");
    process.env.GIT_WORK_TREE=path.join(hostile,"forged-worktree");
    process.env.GIT_OBJECT_DIRECTORY=path.join(hostile,"forged-objects");
    process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES=
      path.join(hostile,"forged-alternates");
    process.env.GIT_CONFIG_COUNT="1";
    process.env.GIT_CONFIG_KEY_0="core.fsmonitor";
    process.env.GIT_CONFIG_VALUE_0=fsmonitor;
    process.env.GIT_EXEC_PATH=path.join(hostile,"fake-exec");

    const hostilePlan=
      await prepareVoidWcVoidMarketVaultCanonicalApplicationV1({
        at_use_artifact_bytes:artifactBytes,
        at_use_artifact_file_sha256:sha256(artifactBytes),
      });
    assert.equal(hostilePlan.application_plan_id,plan.application_plan_id);
    assert.equal(fs.existsSync(sentinel),false);
  }finally{
    for(const [key,values] of prior){
      safeLocalGit(["config","--local","--no-includes","--unset-all",key]);
      for(const value of values){
        const restored=safeLocalGit([
          "config","--local","--no-includes","--add",key,value,
        ]);
        assert.equal(restored.status,0,String(restored.stderr||""));
      }
    }
    for(const [key,value] of saved){
      if(value===undefined)delete process.env[key];
      else process.env[key]=value;
    }
    fs.rmSync(hostile,{recursive:true,force:true});
  }
}

{
  const hostile=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-market-vault-reviewed-runtime-hostile-"),
  );
  const sentinel=path.join(hostile,"node-options-invoked");
  const hook=path.join(hostile,"hook.cjs");
  fs.writeFileSync(
    hook,
    "require('node:fs').writeFileSync("+
      JSON.stringify(sentinel)+",'invoked\\n');\n",
    "utf8",
  );
  const savedNodeOptions=process.env.NODE_OPTIONS;
  const savedNodePath=process.env.NODE_PATH;
  try{
    process.env.NODE_OPTIONS="--require="+hook;
    process.env.NODE_PATH=path.join(hostile,"ambient-node-modules");
    const ambientPlan=
      await prepareVoidWcVoidMarketVaultCanonicalApplicationV1({
        at_use_artifact_bytes:artifactBytes,
        at_use_artifact_file_sha256:sha256(artifactBytes),
      });
    assert.equal(ambientPlan.application_plan_id,plan.application_plan_id);
    assert.equal(fs.existsSync(sentinel),false);
  }finally{
    if(savedNodeOptions===undefined)delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS=savedNodeOptions;
    if(savedNodePath===undefined)delete process.env.NODE_PATH;
    else process.env.NODE_PATH=savedNodePath;
    fs.rmSync(hostile,{recursive:true,force:true});
  }
}

{
  const packageJson="node_modules/ethers/package.json";
  const original=fs.readFileSync(packageJson);
  try{
    const text=original.toString("utf8");
    fs.writeFileSync(
      packageJson,
      Buffer.from(text.endsWith("\n")?text.slice(0,-1)+" \n":text+" ","utf8"),
    );
    await assert.rejects(
      ()=>prepareVoidWcVoidMarketVaultCanonicalApplicationV1({
        at_use_artifact_bytes:artifactBytes,
        at_use_artifact_file_sha256:sha256(artifactBytes),
      }),
      /reviewed_node_runtime_/u,
    );
  }finally{
    fs.writeFileSync(packageJson,original);
  }
}

{
  const original=fs.readFileSync(PRODUCTION);
  try{
    fs.writeFileSync(PRODUCTION,Buffer.concat([original,Buffer.from(" ")]));
    await assert.rejects(
      ()=>prepareVoidWcVoidMarketVaultCanonicalApplicationV1({
        at_use_artifact_bytes:artifactBytes,
        at_use_artifact_file_sha256:sha256(artifactBytes),
      }),
      /MARKET_VAULT_CANONICAL_REPOSITORY_NOT_CLEAN/u,
    );
  }finally{
    fs.writeFileSync(PRODUCTION,original);
  }
}

{
  const original=fs.readFileSync(AT_USE_TOOL);
  try{
    fs.writeFileSync(AT_USE_TOOL,Buffer.concat([original,Buffer.from("\n")]));
    await assert.rejects(
      ()=>prepareVoidWcVoidMarketVaultCanonicalApplicationV1({
        at_use_artifact_bytes:artifactBytes,
        at_use_artifact_file_sha256:sha256(artifactBytes),
      }),
      /MARKET_VAULT_CANONICAL_REPOSITORY_NOT_CLEAN/u,
    );
  }finally{
    fs.writeFileSync(AT_USE_TOOL,original);
  }
}

{
  const planBytes=prettyBytes(plan);
  await assert.rejects(
    ()=>verifyVoidWcVoidMarketVaultCanonicalApplicationV1({
      application_plan_bytes:planBytes,
      application_plan_file_sha256:sha256(planBytes),
    }),
    /MARKET_VAULT_CANONICAL_APPLIED_BRANCH_NOT_MAIN/u,
  );
}

const repeat=await prepareVoidWcVoidMarketVaultCanonicalApplicationV1({
  at_use_artifact_bytes:artifactBytes,
  at_use_artifact_file_sha256:sha256(artifactBytes),
});
assert.equal(repeat.application_plan_id,plan.application_plan_id);

const bridgeSource=fs.readFileSync(
  "tools/void-wc-void-market-vault-reviewed-runtime-bridge-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "writeFileSync",
  "appendFileSync",
  "spawnSync",
  "execSync",
  "fetch(",
  "node:http",
  "node:https",
  "node:net",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
]){
  assert.equal(bridgeSource.includes(forbidden),false,"bridge:"+forbidden);
}

const source=fs.readFileSync(
  "tools/void-wc-void-market-vault-canonical-application-v1.mjs",
  "utf8",
);
for(const forbidden of [
  'from "./void-wc-void-market-vault-at-use-revalidation-v1.mjs"',
  'from "./void-wc-void-production-readiness-v1.mjs"',
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
const focusedWorkflow=fs.readFileSync(
  ".github/workflows/void-wc-void-market-vault-canonical-application-v1.yml",
  "utf8",
);
const workflowPrStart=focusedWorkflow.indexOf("  pull_request:\n");
const workflowPushStart=focusedWorkflow.indexOf("  push:\n");
const workflowPermissionsStart=focusedWorkflow.indexOf("\npermissions:\n");
assert(
  workflowPrStart>=0&&
  workflowPushStart>workflowPrStart&&
  workflowPermissionsStart>workflowPushStart,
  "focused workflow trigger blocks must be present",
);
const workflowPrBlock=focusedWorkflow.slice(workflowPrStart,workflowPushStart);
const workflowPushBlock=focusedWorkflow.slice(
  workflowPushStart,
  workflowPermissionsStart,
);
for(const dependency of [
  "tools/void-reviewed-node-package-runtime-v1.mjs",
  "ops/security/reviewed-node-package-runtime-ethers-v1.json",
  "tools/void-wc-void-market-vault-reviewed-runtime-bridge-v1.mjs",
  "scripts/prove_void_reviewed_node_package_runtime_v1.mjs",
]){
  const token=`- "${dependency}"`;
  assert.equal(
    workflowPrBlock.split(token).length-1,
    1,
    "PR trigger mismatch: "+dependency,
  );
  assert.equal(
    workflowPushBlock.split(token).length-1,
    1,
    "push trigger mismatch: "+dependency,
  );
}

for(const required of [
  "withReviewedExecutionModules",
  "verified_modules_loaded_from_exact_git_objects:true",
  "ephemeral_verified_module_materialization:true",
  "GIT_NO_REPLACE_OBJECTS",
  "--no-replace-objects",
  "core.fsmonitor=false",
  "core.hooksPath=/dev/null",
  "core.attributesFile=/dev/null",
  "GIT_CONFIG_GLOBAL",
  "git_config_isolated:true",
  "runReviewedNodePackageRuntimeV1",
  "materializeReviewedNodePackageRuntimeV1",
  "reviewed_package_runtime_required:true",
  "permission_fenced_reviewed_execution:true",
  "ancestor_package_resolution_forbidden:true",
  "execution_network_isolation_provided:false",
  "canonicalRemoteMainHead",
  "MARKET_VAULT_CANONICAL_TARGET_DELTA_SCOPE_INVALID",
  "application_time_authority:false",
]){
  assert.equal(source.includes(required),true,required);
}

console.log("VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_V1_PROOF_GREEN");
console.log("exact_at_use_artifact_semantically_reverified=true");
console.log("reviewed_execution_modules_loaded_from_git_objects=true");
console.log("git_config_isolated=true");
console.log("hostile_fsmonitor_execution=false");
console.log("reviewed_ethers_package_runtime_bound=true");
console.log("reviewed_runtime_trigger_symmetry_green=true");
console.log("permission_fenced_reviewed_execution=true");
console.log("ancestor_package_resolution_forbidden=true");
console.log("ambient_node_options_execution=false");
console.log("package_byte_drift_fails_closed=true");
console.log("execution_network_isolation_provided=false");
console.log("canonical_head_production_candidate_bound=true");
console.log("exact_five_field_source_delta=true");
console.log("market_vault_independently_verified=true");
console.log("inventory_funded=true");
console.log("inventory_lock_proven=true");
console.log("production_status_remains_hold=true");
console.log("coupled_activation_ready=false");
console.log("evidence_fresh_at_reviewed_collection=true");
console.log("application_time_authority=false");
console.log("canonical_candidate_updated=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
