#!/usr/bin/env node
// Executable ordering proof only. No real network request is permitted.
// Root parent publishes disposable root-custodied fixtures, then an
// unprivileged NoNewPrivs child invokes the real compiled V7 observer with
// node:http/node:https request sentinels installed before V7 import.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const FIXED_ROOT="/var/lib/void-source-finality-v7";
const LIVE_RECEIPT=path.join(FIXED_ROOT,"live-process-binding-v1.json");
const PAIR_RECEIPT=path.join(FIXED_ROOT,"provider-pair-binding-v1.json");
const SETPRIV="/usr/bin/setpriv";
const RECEIPT_MARKER="VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_RECEIPT_V1";
const PROCESS_MARKER="VOID_NODE_PROCESS_SOURCE_IDENTITY_V1";
const SOURCE_COMMIT="1".repeat(40);
const SOURCE_TREE="2".repeat(40);
const INVOCATION_ID="3".repeat(32);
const EXTERNAL_SET="a".repeat(64);
const LOCK_BLOB="b".repeat(40);
const LOCK_SHA="c".repeat(64);
const WAIT_MS=15_000;

const hash=value=>crypto.createHash("sha256").update(value).digest("hex");
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function canonicalJson(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonicalJson).join(",")+"]";
  assert.ok(value&&typeof value==="object"&&!Array.isArray(value),"canonical_value_invalid");
  return "{"+Object.keys(value).sort().map(
    key=>JSON.stringify(key)+":"+canonicalJson(value[key]),
  ).join(",")+"}";
}

function stablePolicy(url,identity){
  const sourceFinalityPolicy={
    enabled:true,
    source_chain:"base",
    chain_id:"8453",
    rpc_url:url,
    rpc_identity:identity,
    rpc_url_fingerprint_sha256:hash(new URL(url).toString()),
    finality_adapter_id:"void-base-finalized-tag-rpc-v1",
    min_confirmations:"3",
    usdc_contract:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    receive_address:"0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5",
    timeout_ms:"8000",
    max_response_bytes:"262144",
  };
  const authorityPolicy={
    schema:"void_buy_void_source_finality_static_policy_v2",
    marker:"VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2",
    version:2,
    rail_order:["base","ethereum"],
    rails:[
      {
        source_chain:"base",
        evm_chain_id:"8453",
        usdc_contract:sourceFinalityPolicy.usdc_contract,
        receive_address:sourceFinalityPolicy.receive_address,
        rpc_identity:identity,
        rpc_url_fingerprint_sha256:sourceFinalityPolicy.rpc_url_fingerprint_sha256,
        finality_adapter_id:sourceFinalityPolicy.finality_adapter_id,
        min_confirmations:"3",
      },
      {
        source_chain:"ethereum",
        evm_chain_id:"1",
        usdc_contract:"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        receive_address:sourceFinalityPolicy.receive_address,
        rpc_identity:identity+"-ethereum",
        rpc_url_fingerprint_sha256:hash(url+"/ethereum"),
        finality_adapter_id:"void-ethereum-finalized-tag-rpc-v1",
        min_confirmations:"3",
      },
    ],
    economics:{
      inventory_void_atoms:"10000000000000",
      void_per_usdc_atoms:"2",
    },
  };
  return {
    source_finality_policy:sourceFinalityPolicy,
    authority_policy_generation:authorityPolicy,
    total_timeout_ms:"60000",
  };
}

const primaryPolicy=stablePolicy("https://rpc-a.example.invalid/v1","provider-a");
const secondaryPolicy=stablePolicy("https://rpc-b.example.invalid/v1","provider-b");

function requestFixture(){
  return {
    request_id:"req-v7-provider-pair-pre-rpc-1",
    source_chain:"base",
    tx_hash:"0x"+"1".repeat(64),
    delivery_address:"0x"+"3".repeat(40),
    receive_address:"0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5",
    usdc_amount:"1",
    quoted_void:"2",
  };
}

function strictRootExecutable(location){
  const st=fs.lstatSync(location);
  assert.ok(
    st.isFile()&&!st.isSymbolicLink()&&st.uid===0&&(st.mode&0o022)===0,
    "reviewed_root_executable_invalid:"+location,
  );
}

async function waitForPath(location,child,label){
  const deadline=Date.now()+WAIT_MS;
  while(Date.now()<deadline){
    if(fs.existsSync(location))return;
    if(child.exitCode!==null){
      throw new Error(label+"_child_exited_early:"+child.exitCode);
    }
    await delay(10);
  }
  throw new Error(label+"_timeout");
}

function reportBestEffortFailure(label,error){
  process.stderr.write(
    "provider_pair_pre_rpc_best_effort_failure="+label+":"+
    String(error?.message||error)+"\n",
  );
}

async function waitForExit(child,stdoutRef,stderrRef){
  if(child.exitCode!==null)return child.exitCode;
  return await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{
      try{child.kill("SIGKILL");}catch(error){reportBestEffortFailure("child_kill",error);}
      reject(new Error("provider_pair_pre_rpc_child_timeout"));
    },WAIT_MS);
    child.once("error",error=>{
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit",code=>{
      clearTimeout(timer);
      resolve(code);
    });
  }).catch(error=>{
    throw new Error(
      String(error?.message||error)+
      "\nstdout="+stdoutRef.value.slice(-2000)+
      "\nstderr="+stderrRef.value.slice(-4000),
    );
  });
}

function writeCreateOnce(location,bytes,mode=0o444){
  const fd=fs.openSync(
    location,
    fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL,
    mode,
  );
  try{
    let offset=0;
    while(offset<bytes.length){
      const written=fs.writeSync(fd,bytes,offset,bytes.length-offset,offset);
      assert.ok(written>0,"fixture_write_zero_progress");
      offset+=written;
    }
    fs.fsyncSync(fd);
  }finally{
    fs.closeSync(fd);
  }
  fs.chownSync(location,0,0);
  fs.chmodSync(location,mode);
}

function providerReceiptMaterial(deploymentId,kind){
  const basePrimary=primaryPolicy.authority_policy_generation.rails[0];
  const baseSecondary=secondaryPolicy.authority_policy_generation.rails[0];
  const ethPrimary=primaryPolicy.authority_policy_generation.rails[1];
  const ethSecondary=secondaryPolicy.authority_policy_generation.rails[1];
  const material={
    schema:"void_buy_void_source_finality_provider_pair_binding_v1",
    marker:RECEIPT_MARKER,
    version:1,
    status:"operator_approved_provider_pair_binding",
    deployment_receipt_id:deploymentId,
    accepted_enforcement_set_sha256:EXTERNAL_SET,
    rails:[
      {
        source_chain:"base",
        primary:{
          rpc_identity:basePrimary.rpc_identity,
          rpc_url_fingerprint_sha256:basePrimary.rpc_url_fingerprint_sha256,
        },
        secondary:{
          rpc_identity:baseSecondary.rpc_identity,
          rpc_url_fingerprint_sha256:baseSecondary.rpc_url_fingerprint_sha256,
        },
      },
      {
        source_chain:"ethereum",
        primary:{
          rpc_identity:ethPrimary.rpc_identity,
          rpc_url_fingerprint_sha256:ethPrimary.rpc_url_fingerprint_sha256,
        },
        secondary:{
          rpc_identity:ethSecondary.rpc_identity,
          rpc_url_fingerprint_sha256:ethSecondary.rpc_url_fingerprint_sha256,
        },
      },
    ],
    authority:{
      operator_approved_provider_pair_binding:true,
      legal_provider_identity_verified:false,
      rpc_contact:false,
      production_source_finality_authority_ready:false,
      public_presale_activation:false,
      funds_movement:false,
    },
  };
  if(kind==="wrong_deployment"){
    material.deployment_receipt_id="voidbsfdep1_"+"0".repeat(64);
  }else if(kind==="wrong_enforcement"){
    material.accepted_enforcement_set_sha256="0".repeat(64);
  }else if(kind==="swapped"){
    const first=material.rails[0];
    [first.primary,first.secondary]=[first.secondary,first.primary];
  }
  return material;
}

async function childMain(ipcDir){
  const originalReadFileSync=fs.readFileSync.bind(fs);
  const fakeCgroup=
    "0::/user.slice/user-"+process.getuid()+
    ".slice/user@"+process.getuid()+
    ".service/app.slice/void-node-live.service\n";
  fs.readFileSync=function(location,...args){
    if(String(location)==="/proc/self/cgroup"){
      const bytes=Buffer.from(fakeCgroup,"utf8");
      const option=args[0];
      if(typeof option==="string")return bytes.toString(option);
      if(option&&typeof option==="object"&&typeof option.encoding==="string"){
        return bytes.toString(option.encoding);
      }
      return bytes;
    }
    return originalReadFileSync(location,...args);
  };

  const liveModule=await import(
    pathToFileURL(
      path.join(ROOT,"dist/economic/buy_void_source_finality_live_process_binding_v1.js"),
    ).href+"?proof="+Date.now(),
  );
  const self=liveModule.readBuyVoidSourceFinalitySelfProcessIdentityV1();
  fs.writeFileSync(
    path.join(ipcDir,"identity.json"),
    JSON.stringify(self)+"\n",
    {flag:"wx",mode:0o600},
  );

  const goPath=path.join(ipcDir,"go");
  const deadline=Date.now()+WAIT_MS;
  while(!fs.existsSync(goPath)){
    if(Date.now()>=deadline)throw new Error("provider_pair_pre_rpc_go_timeout");
    await delay(10);
  }

  const http=await import("node:http");
  const https=await import("node:https");
  let httpCount=0;
  let httpsCount=0;
  http.default.request=()=>{
    httpCount+=1;
    throw new Error("VOID_V7_HTTP_REQUEST_SENTINEL");
  };
  https.default.request=()=>{
    httpsCount+=1;
    throw new Error("VOID_V7_HTTPS_REQUEST_SENTINEL");
  };

  const input=JSON.parse(
    originalReadFileSync(path.join(ipcDir,"input.json"),"utf8"),
  );
  const v7=await import(
    pathToFileURL(
      path.join(ROOT,"dist/economic/buy_void_source_finality_generation_provenance_v7.js"),
    ).href+"?proof="+Date.now(),
  );

  let result=null;
  let thrown=null;
  try{
    result=await v7.observeBuyVoidSourceFinalityGenerationProvenanceV7(input);
  }catch(error){
    thrown=String(error?.message||error);
  }
  fs.writeFileSync(
    path.join(ipcDir,"result.json"),
    JSON.stringify({
      result,
      thrown,
      http_request_count:httpCount,
      https_request_count:httpsCount,
    })+"\n",
    {flag:"wx",mode:0o600},
  );
}

async function runCase(kind,expectedReason,helpers){
  assert.equal(fs.existsSync(FIXED_ROOT),false,"fixed_v7_fixture_root_collision");
  fs.mkdirSync(FIXED_ROOT,{mode:0o755});
  fs.chownSync(FIXED_ROOT,0,0);
  fs.chmodSync(FIXED_ROOT,0o755);

  const depDir=fs.mkdtempSync(path.join("/run","void-v7-pre-rpc-"));
  fs.chownSync(depDir,0,0);
  fs.chmodSync(depDir,0o755);
  const deploymentPath=path.join(depDir,"deployment.json");

  const ipcDir=fs.mkdtempSync(path.join(os.tmpdir(),"void-v7-pre-rpc-ipc-"));
  const repoStat=fs.lstatSync(ROOT);
  const targetUid=Number(process.env.SUDO_UID||repoStat.uid);
  const targetGid=Number(process.env.SUDO_GID||repoStat.gid);
  assert.ok(
    Number.isInteger(targetUid)&&targetUid>0&&
    Number.isInteger(targetGid)&&targetGid>0,
    "unprivileged_fixture_identity_unavailable",
  );
  fs.chownSync(ipcDir,targetUid,targetGid);
  fs.chmodSync(ipcDir,0o700);

  const env={
    PATH:"/usr/bin:/bin",
    HOME:"/nonexistent",
    LANG:"C",
    LC_ALL:"C",
    TZ:"UTC",
    NODE_OPTIONS:"--no-warnings",
    VOID_PROCESS_SOURCE_IDENTITY_MARKER:PROCESS_MARKER,
    VOID_PROCESS_SOURCE_COMMIT:SOURCE_COMMIT,
    VOID_PROCESS_SOURCE_TREE:SOURCE_TREE,
    VOID_PROCESS_SOURCE_BRANCH:"main",
    INVOCATION_ID:INVOCATION_ID,
    VOID_CANONICAL_PRODUCER_ROLE:"1",
  };

  const input={
    request:requestFixture(),
    policy:{
      primary:primaryPolicy,
      secondary:secondaryPolicy,
      deployment_receipt_path:deploymentPath,
      live_process_binding_receipt_path:LIVE_RECEIPT,
      process_source_identity:{
        marker:PROCESS_MARKER,
        commit:SOURCE_COMMIT,
        tree:SOURCE_TREE,
        branch:"main",
      },
      total_timeout_ms:"60000",
    },
  };
  writeCreateOnce(
    path.join(ipcDir,"input.json"),
    Buffer.from(JSON.stringify(input)+"\n","utf8"),
    0o444,
  );
  fs.chownSync(path.join(ipcDir,"input.json"),targetUid,targetGid);

  const stdoutRef={value:""};
  const stderrRef={value:""};
  const child=spawn(
    SETPRIV,
    [
      "--no-new-privs",
      "--reuid="+String(targetUid),
      "--regid="+String(targetGid),
      "--clear-groups",
      process.execPath,
      fileURLToPath(import.meta.url),
      "--child",
      ipcDir,
    ],
    {
      cwd:ROOT,
      env,
      stdio:["ignore","pipe","pipe"],
    },
  );
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data",chunk=>{stdoutRef.value+=chunk;});
  child.stderr.on("data",chunk=>{stderrRef.value+=chunk;});

  try{
    const identityPath=path.join(ipcDir,"identity.json");
    await waitForPath(identityPath,child,"identity");
    const self=JSON.parse(fs.readFileSync(identityPath,"utf8"));

    const sourceInventory=
      helpers.v7.inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
    assert.equal(sourceInventory.reviewed_source_file_count,"9");

    const lockId=helpers.v7.buyVoidSourceFinalityEnforcementLockIdV7({
      accepted_enforcement_set_sha256:EXTERNAL_SET,
      accepted_enforcement_lock_git_blob_sha1:LOCK_BLOB,
      accepted_enforcement_lock_sha256:LOCK_SHA,
    });
    const deploymentBody={
      marker:helpers.v7.VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
      version:1,
      status:"DEPLOYED_SOURCE_FINALITY_GENERATION_ACCEPTED",
      process_source_marker:PROCESS_MARKER,
      process_source_commit:SOURCE_COMMIT,
      process_source_tree:SOURCE_TREE,
      process_source_branch:"main",
      accepted_enforcement_lock_git_blob_sha1:LOCK_BLOB,
      accepted_enforcement_lock_id:lockId,
      accepted_enforcement_lock_sha256:LOCK_SHA,
      accepted_enforcement_set_sha256:EXTERNAL_SET,
      candidate_enforcement_identity_accepted:true,
      complete_executable_closure_verified:true,
      reviewed_source_files_sha256:sourceInventory.reviewed_source_files_sha256,
      reviewed_source_file_count:"9",
    };
    const deployment={
      ...deploymentBody,
      receipt_id:helpers.v7.buyVoidSourceFinalityDeploymentReceiptIdV7(
        deploymentBody,
      ),
    };
    writeCreateOnce(
      deploymentPath,
      Buffer.from(JSON.stringify(deployment,null,2)+"\n","utf8"),
      0o444,
    );

    const liveMaterial={
      marker:helpers.live.VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V1,
      version:1,
      deployment_receipt_id:deployment.receipt_id,
      ...self,
      source_custody_proven:true,
      reviewed_service_contract_proven:true,
      reviewed_launcher_contract_proven:true,
    };
    const liveReceipt={
      ...liveMaterial,
      receipt_id:
        helpers.live.buyVoidSourceFinalityLiveProcessBindingReceiptIdV1(
          liveMaterial,
        ),
    };
    writeCreateOnce(
      LIVE_RECEIPT,
      Buffer.from(JSON.stringify(liveReceipt,null,2)+"\n","utf8"),
      0o444,
    );

    const pairMaterial=providerReceiptMaterial(deployment.receipt_id,kind);
    let pairReceipt={
      ...pairMaterial,
      receipt_id:
        helpers.pair.buyVoidSourceFinalityProviderPairBindingReceiptIdV1(
          pairMaterial,
        ),
    };
    if(kind==="tampered_receipt_id"){
      pairReceipt={...pairReceipt,receipt_id:"voidbsfpp1_"+"0".repeat(64)};
    }
    writeCreateOnce(
      PAIR_RECEIPT,
      Buffer.from(canonicalJson(pairReceipt)+"\n","utf8"),
      0o444,
    );

    fs.writeFileSync(path.join(ipcDir,"go"),"go\n",{flag:"wx",mode:0o444});
    fs.chownSync(path.join(ipcDir,"go"),targetUid,targetGid);

    const resultPath=path.join(ipcDir,"result.json");
    await waitForPath(resultPath,child,"result");
    const exitCode=await waitForExit(child,stdoutRef,stderrRef);
    assert.equal(
      exitCode,0,
      "child_exit_failed stdout="+stdoutRef.value+" stderr="+stderrRef.value,
    );
    const observed=JSON.parse(fs.readFileSync(resultPath,"utf8"));
    assert.equal(observed.http_request_count,0,kind+": unexpected HTTP request");

    if(kind==="valid"){
      assert.ok(
        observed.https_request_count>=1,
        "valid provider pair did not reach HTTPS request sentinel",
      );
      assert.equal(
        observed.result?.production_source_finality_authority_ready??false,
        false,
      );
      return observed;
    }

    assert.equal(observed.https_request_count,0,kind+": unexpected HTTPS request");
    assert.equal(observed.thrown,null,kind+": invalid receipt unexpectedly threw");
    assert.equal(observed.result?.ok,false,kind+": invalid receipt unexpectedly ready");
    assert.equal(
      observed.result?.reason,
      expectedReason,
      kind+": wrong provider-pair HOLD reason",
    );
    return observed;
  }finally{
    if(child.exitCode===null){
      try{child.kill("SIGKILL");}catch(error){reportBestEffortFailure("child_kill",error);}
    }
    try{fs.chmodSync(LIVE_RECEIPT,0o600);}catch(error){reportBestEffortFailure("live_receipt_chmod",error);}
    try{fs.chmodSync(PAIR_RECEIPT,0o600);}catch(error){reportBestEffortFailure("pair_receipt_chmod",error);}
    try{fs.rmSync(FIXED_ROOT,{recursive:true,force:true});}catch(error){reportBestEffortFailure("fixed_root_remove",error);}
    try{fs.chmodSync(depDir,0o700);}catch(error){reportBestEffortFailure("dependency_dir_chmod",error);}
    try{fs.rmSync(depDir,{recursive:true,force:true});}catch(error){reportBestEffortFailure("dependency_dir_remove",error);}
    try{
      fs.chownSync(ipcDir,0,0);
      fs.chmodSync(ipcDir,0o700);
      fs.rmSync(ipcDir,{recursive:true,force:true});
    }catch(error){reportBestEffortFailure("ipc_dir_cleanup",error);}
  }
}

async function parentMain(){
  assert.equal(process.platform,"linux","linux_required");
  assert.equal(process.geteuid?.(),0,"root_parent_required");
  assert.ok(fs.existsSync("/run"),"run_directory_required");
  strictRootExecutable(SETPRIV);

  const [v7,live,pair]=await Promise.all([
    import("../dist/economic/buy_void_source_finality_generation_provenance_v7.js"),
    import("../dist/economic/buy_void_source_finality_live_process_binding_v1.js"),
    import("../dist/economic/buy_void_source_finality_provider_pair_binding_v1.js"),
  ]);
  assert.equal(
    live.VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V1,
    LIVE_RECEIPT,
  );
  assert.equal(
    pair.VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_PATH_V1,
    PAIR_RECEIPT,
  );
  const helpers={v7,live,pair};

  const invalidCases=[
    [
      "wrong_deployment",
      "source_finality_provider_pair_provider_pair_deployment_receipt_mismatch",
    ],
    [
      "wrong_enforcement",
      "source_finality_provider_pair_provider_pair_enforcement_set_mismatch",
    ],
    [
      "swapped",
      "source_finality_provider_pair_provider_pair_observation_binding_mismatch",
    ],
    [
      "tampered_receipt_id",
      "source_finality_provider_pair_provider_pair_receipt_id_mismatch",
    ],
  ];
  for(const [kind,reason] of invalidCases){
    await runCase(kind,reason,helpers);
  }
  const valid=await runCase("valid",null,helpers);
  assert.ok(valid.https_request_count>=1);

  console.log("VOID_BUY_VOID_V7_PROVIDER_PAIR_PRE_RPC_EXECUTABLE_V1_GREEN");
  console.log("invalid_provider_pair_case_count="+invalidCases.length);
  console.log("invalid_provider_pair_http_request_count=0");
  console.log("invalid_provider_pair_https_request_count=0");
  console.log("valid_provider_pair_reaches_https_request_sentinel=true");
  console.log("real_v7_observer_invoked=true");
  console.log("production_dependency_injection_seam_added=false");
  console.log("real_network_contact=false");
  console.log("credential_access=false");
  console.log("wallet_or_signer_access=false");
  console.log("transaction_signing=false");
  console.log("transaction_broadcast=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}

if(process.argv[2]==="--child"){
  const ipc=process.argv[3];
  if(!ipc)throw new Error("child_ipc_path_required");
  await childMain(ipc);
}else{
  await parentMain();
}
