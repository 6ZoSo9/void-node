#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE_FLOOR="e4665edd13c5fdeb40ff59bc1ff4e09fd7def3e2";
const PACKAGE_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";
const BUILD_BLOB="d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb";
const RUNTIME_TOOL="tools/void-reviewed-node-package-runtime-v1.mjs";
const RUNTIME_TOOL_BLOB="6475c3f18ffe566cf5f448ca1de4795391a6efde";
const PROFILE="ops/security/reviewed-node-package-runtime-ethers-v2.json";
const PROFILE_BLOB="a09f47596fdf66afef64e82200f23966664a7d2c";
const PROFILE_PROOF="scripts/prove_void_reviewed_node_package_runtime_v2.mjs";
const PROFILE_PROOF_BLOB="534939ec04a02ad612079dc7f5f0aad5f9355956";
const CENSUS="scripts/prove_buy_void_enforcement_dynamic_tool_candidates_v1.mjs";
const CENSUS_BLOB="368ade74f36acad899420db5cf994363d6dfa04a";
const PROFILE_ID="voidrnpr1_7cfd6b67e6c2bde498196fa8bc880031ea24f95942c194ee7e6f553054c08451";
const PACKAGE_AGG="5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73";

const TARGETS={
  broadcaster:{
    path:"tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs",
    blob:"70cd6ea46abecf82beb498cf61dabced2cf37084",
    marker:"VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_V1",
    authority:"VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_AUTHORITY_V1",
    factory:"createPreparedTransactionBroadcasterServiceV1",
    exports:[
      "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1",
      "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_AUTHORITY_V1",
      "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_V1",
      "createPreparedTransactionBroadcasterServiceV1",
    ],
  },
  custodian:{
    path:"tools/buy-void-prepared-transaction-custodian-service-v1.mjs",
    blob:"ccf31c736ed125b0bd3e977a8c734b9e9ae67b33",
    marker:"VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1",
    authority:"VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_AUTHORITY_V1",
    factory:"createPreparedTransactionCustodianServiceV1",
    exports:[
      "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1",
      "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_AUTHORITY_V1",
      "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1",
      "createPreparedTransactionCustodianServiceV1",
    ],
  },
};
const CALLERS=[
  {
    kind:"broadcaster",
    source:"src/economic/buy_void_prepared_transaction_broadcaster_chain2050_composition_v1.ts",
    blob:"e39df18f6b5324ead0707fe20ca7ae13f6b37046",
    compiled:"dist/economic/buy_void_prepared_transaction_broadcaster_chain2050_composition_v1.js",
  },
  {
    kind:"broadcaster",
    source:"src/economic/buy_void_prepared_transaction_broadcaster_inspection_activation_v1.ts",
    blob:"e25eccc52d527eb17f06e7cf0e49044b8924b5db",
    compiled:"dist/economic/buy_void_prepared_transaction_broadcaster_inspection_activation_v1.js",
  },
  {
    kind:"broadcaster",
    source:"src/economic/buy_void_prepared_transaction_broadcaster_submission_activation_v1.ts",
    blob:"b752b0800b8eaddc6b9670de7173bd7f8ef0f17c",
    compiled:"dist/economic/buy_void_prepared_transaction_broadcaster_submission_activation_v1.js",
  },
  {
    kind:"custodian",
    source:"src/economic/buy_void_prepared_transaction_custodian_credential_composition_v1.ts",
    blob:"9c51ea0ff2b7c1235078f81d808f7d991763bd25",
    compiled:"dist/economic/buy_void_prepared_transaction_custodian_credential_composition_v1.js",
  },
];

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}
function exact(relative,blob,max=2*1024*1024){
  const file=path.join(ROOT,...relative.split("/"));
  const stat=fs.lstatSync(file);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&stat.size>0&&stat.size<=max);
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.length,stat.size);
  assert.equal(gitBlob(bytes),blob,"blob drift: "+relative);
  return bytes;
}
function git(args){
  return execFileSync(
    "/usr/bin/git",
    ["-c","core.hooksPath=/dev/null","-c","core.fsmonitor=false","-c","diff.external=",...args],
    {
      cwd:ROOT,
      env:{
        PATH:"/usr/bin:/bin",
        HOME:"/nonexistent",
        LANG:"C",
        LC_ALL:"C",
        TZ:"UTC",
        GIT_CONFIG_NOSYSTEM:"1",
        GIT_CONFIG_GLOBAL:"/dev/null",
      },
      encoding:"utf8",
      timeout:20000,
      maxBuffer:4*1024*1024,
    },
  );
}
function sourceBoundary(){
  assert.equal(process.platform,"linux");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));
  git(["merge-base","--is-ancestor",SOURCE_FLOOR,"HEAD"]);

  exact("package.json",PACKAGE_BLOB,128*1024);
  exact("package-lock.json",LOCK_BLOB,1024*1024);
  exact("tsconfig.build.json",BUILD_BLOB,128*1024);
  exact(RUNTIME_TOOL,RUNTIME_TOOL_BLOB,128*1024);
  exact(PROFILE,PROFILE_BLOB,4*1024*1024);
  exact(PROFILE_PROOF,PROFILE_PROOF_BLOB,256*1024);
  exact(CENSUS,CENSUS_BLOB,256*1024);
  for(const target of Object.values(TARGETS)) exact(target.path,target.blob);
  for(const caller of CALLERS) exact(caller.source,caller.blob,512*1024);

  const census=fs.readFileSync(path.join(ROOT,CENSUS),"utf8");
  for(const target of Object.values(TARGETS)){
    assert.ok(census.includes(target.path),"historical census target missing: "+target.path);
  }
}

function proveAuditedPackageProfile(){
  const out=execFileSync(process.execPath,[path.join(ROOT,PROFILE_PROOF)],{
    cwd:ROOT,
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
    },
    encoding:"utf8",
    timeout:120000,
    maxBuffer:4*1024*1024,
  });
  assert.match(out,/VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V2_ENFORCEMENT_GREEN/u);
  assert.match(out,/frozen_v1_refuses_current_package_generation=true/u);
  assert.match(out,/private_ethers_import_green=true/u);
}

const LOADER_RE=/async function defaultServiceModule\(\) \{\s+const dynamicImport = new Function\(\s*"specifier",\s*"return import\(specifier\)",?\s*\);\s+return dynamicImport\(\s*"([^"]+)"\s*\);\s+\}/u;
function loader(caller){
  const bytes=fs.readFileSync(path.join(ROOT,caller.compiled));
  assert.ok(bytes.length>0&&bytes.length<=2*1024*1024);
  const source=bytes.toString("utf8");
  const match=source.match(LOADER_RE);
  assert.ok(match,"loader shape drift: "+caller.compiled);
  assert.equal(match[1],"../../"+TARGETS[caller.kind].path);
  assert.equal((source.match(/async function defaultServiceModule\(/gu)||[]).length,1);
  return {
    source:match[0],
    specifier:match[1],
    bytes:bytes.length,
    sha256:sha256(bytes),
  };
}
async function runtime(){
  const bytes=exact(RUNTIME_TOOL,RUNTIME_TOOL_BLOB,128*1024);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"void-rnr-v2-"));
  const file=path.join(dir,"runtime.mjs");
  try{
    fs.writeFileSync(file,bytes,{flag:"wx",mode:0o400});
    return await import(pathToFileURL(file).href);
  }finally{
    fs.chmodSync(dir,0o700);
    if(fs.existsSync(file)) fs.chmodSync(file,0o600);
    fs.rmSync(dir,{recursive:true,force:true});
  }
}
function writeExclusive(file,bytes){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const fd=fs.openSync(
    file,
    fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|Number(fs.constants.O_NOFOLLOW||0),
    0o400,
  );
  try{
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
  }finally{
    fs.closeSync(fd);
  }
}
function unlock(root){
  if(!fs.existsSync(root)) return;
  fs.chmodSync(root,0o700);
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    const file=path.join(root,entry.name);
    if(entry.isDirectory()) unlock(file);
    else fs.chmodSync(file,0o600);
  }
}
function entry(caller,loaderInfo){
  const target=TARGETS[caller.kind];
  const authority=caller.kind==="broadcaster"
    ? "if(a.runtime_route_mount!==false||a.background_loop!==false||a.startup_execution!==false||a.application_wallet_access!==false||a.application_signing!==false)throw new Error('authority');"
    : "if(a.transaction_broadcast_interface!==false||a.application_private_key_access!==false||a.application_wallet_access!==false||a.money_movement!==false)throw new Error('authority');";
  return [
    loaderInfo.source,
    "const m=await defaultServiceModule();",
    "const exp="+JSON.stringify(target.exports)+";",
    "const got=Object.keys(m).sort();",
    "if(JSON.stringify(got)!==JSON.stringify([...exp].sort()))throw new Error('exports');",
    "if(m["+JSON.stringify(target.marker)+"]!=="+JSON.stringify(target.marker)+")throw new Error('marker');",
    "if(typeof m["+JSON.stringify(target.factory)+"]!=='function')throw new Error('factory');",
    "const a=m["+JSON.stringify(target.authority)+"];",
    "if(!a||a.source_only_service!==true||a.cli_activation!==false)throw new Error('authority');",
    authority,
    "console.log(JSON.stringify({caller:"+JSON.stringify(caller.source)+",tool:"+JSON.stringify(target.path)+",service_factory_invoked:false,service_started:false,socket_created:false,credential_or_private_key_access:false,signing:false,transaction_submission:false,transaction_broadcast:false,money_movement:false}));",
  ].join("\n");
}

async function derive(){
  sourceBoundary();
  proveAuditedPackageProfile();

  const rt=await runtime();
  for(const name of [
    "readReviewedNodePackageRuntimeProfileV1",
    "verifyReviewedNodePackageRuntimeV1",
    "materializeReviewedNodePackageRuntimeV1",
    "runReviewedNodePackageRuntimeV1",
  ]) assert.equal(typeof rt[name],"function");

  const pinned=rt.readReviewedNodePackageRuntimeProfileV1({
    relativePath:PROFILE,
    repoRoot:ROOT,
  });
  assert.equal(pinned.profile_source.git_blob_sha1,PROFILE_BLOB);
  const profile=pinned.profile;
  assert.equal(profile.profile_id,PROFILE_ID);
  assert.equal(profile.packages_aggregate_sha256,PACKAGE_AGG);
  assert.equal(profile.package_json_source.git_blob_sha1,PACKAGE_BLOB);
  assert.equal(profile.package_lock_source.git_blob_sha1,LOCK_BLOB);
  assert.equal(profile.packages.find(row=>row.name==="ethers")?.version,"6.17.0");
  rt.verifyReviewedNodePackageRuntimeV1({profile,repoRoot:ROOT});

  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-private-loaders-v2-"));
  const privateRoot=path.join(temp,"runtime");
  const callers=[];
  try{
    rt.materializeReviewedNodePackageRuntimeV1({
      profile,
      repoRoot:ROOT,
      destinationRoot:privateRoot,
    });
    for(const target of Object.values(TARGETS)){
      writeExclusive(path.join(privateRoot,target.path),exact(target.path,target.blob));
    }
    let index=0;
    for(const caller of CALLERS){
      const loaderInfo=loader(caller);
      const entryFile=path.join(privateRoot,"dist","economic","loader-v2-"+index+".mjs");
      writeExclusive(entryFile,Buffer.from(entry(caller,loaderInfo),"utf8"));
      const execution=rt.runReviewedNodePackageRuntimeV1({
        profile,
        destinationRoot:privateRoot,
        entryFile,
        repoRoot:ROOT,
        timeoutMs:20000,
      });
      assert.equal(execution.ok,true,execution.stderr);
      assert.equal(execution.stderr.trim(),"");
      const lines=execution.stdout.trim().split("\n").filter(Boolean);
      assert.equal(lines.length,1);
      const result=JSON.parse(lines[0]);
      assert.equal(result.caller,caller.source);
      assert.equal(result.tool,TARGETS[caller.kind].path);
      for(const key of [
        "service_factory_invoked","service_started","socket_created",
        "credential_or_private_key_access","signing","transaction_submission",
        "transaction_broadcast","money_movement",
      ]) assert.equal(result[key],false);
      callers.push({
        kind:caller.kind,
        source_path:caller.source,
        source_git_blob_sha1:caller.blob,
        compiled_path:caller.compiled,
        compiled_bytes:loaderInfo.bytes,
        compiled_sha256:loaderInfo.sha256,
        tool_specifier:loaderInfo.specifier,
        permission_fenced_execution:execution.permission_fenced,
      });
      index+=1;
    }
  }finally{
    unlock(temp);
    fs.rmSync(temp,{recursive:true,force:true});
  }

  assert.equal(callers.filter(row=>row.kind==="broadcaster").length,3);
  assert.equal(callers.filter(row=>row.kind==="custodian").length,1);

  return {
    schema:"void_buy_void_private_service_loader_initialization_v2",
    marker:"VOID_BUY_VOID_PRIVATE_SERVICE_LOADER_INITIALIZATION_V2",
    version:2,
    source_floor:SOURCE_FLOOR,
    package_generation:"audited_post_2865",
    reviewed_package_profile_id:PROFILE_ID,
    reviewed_packages_aggregate_sha256:PACKAGE_AGG,
    historical_dynamic_tool_census_git_blob_sha1:CENSUS_BLOB,
    historical_dynamic_tool_census_reexecuted:false,
    audited_generation_frozen_census_positive:false,
    caller_count:4,
    broadcaster_caller_count:3,
    custodian_caller_count:1,
    callers,
    actual_compiled_loader_body_executed:true,
    exact_service_module_bytes_imported:true,
    broadcaster_module_initialization_qualified:true,
    custodian_module_initialization_qualified:true,
    service_factory_invoked:false,
    service_started:false,
    socket_created:false,
    credential_or_private_key_access:false,
    rpc_call:false,
    execution_network_isolation_provided:false,
    signing:false,
    transaction_construction:false,
    transaction_submission:false,
    transaction_broadcast:false,
    money_movement:false,
    dynamic_tool_initialization_closure_verified_for_broadcaster_and_custodian:true,
    complete_executable_closure_verified:false,
    accepted_enforcement_generation:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    presale_activation:false,
    funds_movement:false,
  };
}
function selfTest(){
  const source='async function defaultServiceModule() {\n const dynamicImport = new Function("specifier", "return import(specifier)");\n return dynamicImport("../../tools/x.mjs");\n}';
  const match=source.match(LOADER_RE);
  assert.ok(match);
  assert.equal(match[1],"../../tools/x.mjs");
  assert.equal('async function defaultServiceModule(){return eval("x")} '.match(LOADER_RE),null);
  console.log("VOID_BUY_VOID_PRIVATE_SERVICE_LOADER_INITIALIZATION_V2_SELF_TEST_GREEN");
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test") selfTest();
else if(args.length===1&&args[0]==="--derive") process.stdout.write(JSON.stringify(await derive(),null,2)+"\n");
else throw new Error("private_service_loader_initialization_v2_proof_only_no_runtime_authority");
