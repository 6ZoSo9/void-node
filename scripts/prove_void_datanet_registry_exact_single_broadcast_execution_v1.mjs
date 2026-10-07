#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import {syncBuiltinESMExports} from "node:module";
import {spawnSync} from "node:child_process";

import {
  testOnlyClassifyReviewedNodeBuiltinV1,
  testOnlyImportSyntheticReviewedModuleV1,
  testOnlyMaterializeReviewedSourcesV1,
  testOnlyPrepareAndRecheckReviewedAuthorityV1,
  testOnlyPrepareReviewedExecutionPrivateTreeAbaV1,
  testOnlyPrepareReviewedExecutionV1,
  testOnlyReadExactHeadSourceV1,
  testOnlyReviewedGitHeadV1,
  testOnlyRpcFactoryV1,
  testOnlyReviewedSourcePlanV1,
  testOnlyStaticImportSpecifiersV1,
  testOnlyVerifyReviewedSourcesV1,
} from "../ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";

import {
  submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1,
} from "../tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
import {
  voidDatanetRegistryBroadcastOperationIdV1,
} from "../tools/void-datanet-registry-single-use-broadcast-authorization-consumption-v1.mjs";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}

const REVIEWED_LAUNCHER_REL =
  "ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
const REVIEWED_TOOL_REL =
  "tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
const REVIEWED_NETWORK_MODULES = Object.freeze([
  "tools/void-datanet-registry-deployment-fee-funding-observer-v1.mjs",
  "tools/void-datanet-registry-prebroadcast-observer-v1.mjs",
]);

const reviewedPlan=testOnlyReviewedSourcePlanV1();
assert.equal(reviewedPlan.closure.length,27);
assert.deepEqual(reviewedPlan.bare_packages,["ethers"]);
assert.deepEqual(
  reviewedPlan.node_builtins,
  ["node:crypto","node:fs","node:http","node:path"],
);
assert.deepEqual(
  reviewedPlan.network_capable_modules,
  REVIEWED_NETWORK_MODULES,
);
assert.equal(
  testOnlyClassifyReviewedNodeBuiltinV1("node:crypto"),
  "safe",
);
assert.equal(
  testOnlyClassifyReviewedNodeBuiltinV1("node:http"),
  "network",
);
for(const forbidden of [
  "node:http2",
  "node:https",
  "node:net",
  "node:tls",
  "node:dns",
  "node:dgram",
]){
  assert.throws(
    ()=>testOnlyClassifyReviewedNodeBuiltinV1(forbidden),
    /reviewed_source_builtin_import_unapproved/u,
    "uncensused reviewed built-in must HOLD: "+forbidden,
  );
}

assert.deepEqual(
  testOnlyStaticImportSpecifiersV1(
    'import/**/ net from/* reviewed-gap */"node:net";',
  ),
  ["node:net"],
  "comment-separated static import must be traversed",
);
assert.deepEqual(
  testOnlyStaticImportSpecifiersV1(
    'export/**/ {default as net} from/* reviewed-gap */"node:net";',
  ),
  ["node:net"],
  "comment-separated export-from must be traversed",
);
assert.throws(
  ()=>testOnlyStaticImportSpecifiersV1(
    'const net=await import/**/("node:net"); void net;',
  ),
  /reviewed_source_dynamic_import_forbidden/u,
  "comment-separated dynamic import must fail reviewed planning",
);

let reviewedExecveSentinelCalls=0;
if(typeof process.execve==="function"){
  const execveDescriptor=
    Object.getOwnPropertyDescriptor(process,"execve");
  assert.ok(execveDescriptor);
  assert.equal(typeof execveDescriptor.value,"function");
  assert.ok(
    execveDescriptor.configurable===true||
    execveDescriptor.writable===true,
    "process.execve must be replaceable before reviewed fence installation",
  );
  Object.defineProperty(process,"execve",{
    ...execveDescriptor,
    value(){
      reviewedExecveSentinelCalls+=1;
      throw new Error("reviewed_execve_test_sentinel_called");
    },
  });
  await assert.rejects(
    ()=>testOnlyImportSyntheticReviewedModuleV1(
      'export default process.execve('+
      'process.execPath,'+
      '[process.execPath,"-e","process.exit(91)"],'+
      'process.env);',
    ),
    /reviewed_ambient_process_execve_forbidden/u,
    "reviewed module must not replace the broadcaster process through process.execve",
  );
  assert.equal(
    reviewedExecveSentinelCalls,
    0,
    "reviewed ambient fence must replace the execve sentinel before module execution",
  );
}

await assert.rejects(
  ()=>testOnlyImportSyntheticReviewedModuleV1(
    'import/**/ * as net from/* gap */"node:net"; export default net;',
  ),
  /reviewed_graph_builtin_import_unapproved:node:net/u,
  "runtime resolver must independently reject uncensused static built-in",
);
await assert.rejects(
  ()=>testOnlyImportSyntheticReviewedModuleV1(
    'const net=await import/**/("node:net"); export default net;',
  ),
  /reviewed_graph_builtin_import_unapproved:node:net/u,
  "runtime resolver must independently reject uncensused dynamic built-in",
);
await assert.rejects(
  ()=>testOnlyImportSyntheticReviewedModuleV1(
    'import/**/ * as http from "node:http"; export default http;',
  ),
  /reviewed_graph_network_builtin_parent_uncensused/u,
  "approved network builtin still requires exact parent census",
);

const syntheticSafeBuiltin=
  await testOnlyImportSyntheticReviewedModuleV1(
    'import/**/ * as crypto from/* gap */"node:crypto"; '+
    'export default typeof crypto.createHash==="function";',
  );
assert.equal(syntheticSafeBuiltin.default,true);

const syntheticCensusedNetworkBuiltin=
  await testOnlyImportSyntheticReviewedModuleV1(
    'import/**/ * as http from/* gap */"node:http"; '+
    'export default typeof http.request==="function";',
    {networkCapable:true},
  );
assert.equal(syntheticCensusedNetworkBuiltin.default,true);

if(typeof process.getBuiltinModule==="function"){
  await assert.rejects(
    ()=>testOnlyImportSyntheticReviewedModuleV1(
      'export default process.getBuiltinModule("node:net");',
    ),
    /reviewed_ambient_get_builtin_module_forbidden/u,
    "reviewed module must not bypass resolver through process.getBuiltinModule",
  );
}

for(const [label,source] of [
  [
    "computed global fetch",
    'export default globalThis["fetch"]("data:text/plain,reviewed");',
  ],
  [
    "fetch.call",
    'export default fetch.call(null,"data:text/plain,reviewed");',
  ],
  [
    "aliased fetch",
    'const request=fetch; export default request("data:text/plain,reviewed");',
  ],
]){
  await assert.rejects(
    ()=>testOnlyImportSyntheticReviewedModuleV1(source),
    /reviewed_ambient_fetch_forbidden/u,
    label+" must not bypass reviewed network authority",
  );
}

await assert.rejects(
  ()=>testOnlyImportSyntheticReviewedModuleV1(
    'export default await new Promise((resolve,reject)=>'+
    'setTimeout(()=>Promise.resolve().then(()=>fetch("data:text/plain,late"))'+
    '.then(resolve,reject),0));',
  ),
  /reviewed_ambient_fetch_forbidden/u,
  "deferred reviewed async work must retain ambient fetch denial",
);

if(typeof process.binding==="function"){
  await assert.rejects(
    ()=>testOnlyImportSyntheticReviewedModuleV1(
      'export default process.binding("tcp_wrap");',
    ),
    /reviewed_ambient_process_binding_forbidden/u,
    "reviewed module must not bypass builtin census through process.binding",
  );
}
if(typeof process._linkedBinding==="function"){
  await assert.rejects(
    ()=>testOnlyImportSyntheticReviewedModuleV1(
      'export default process._linkedBinding("void_missing_binding");',
    ),
    /reviewed_ambient_process_linked_binding_forbidden/u,
    "reviewed module must not reach linked bindings directly",
  );
}
if(typeof globalThis.WebSocket==="function"){
  await assert.rejects(
    ()=>testOnlyImportSyntheticReviewedModuleV1(
      'export default new WebSocket("ws://127.0.0.1:9");',
    ),
    /reviewed_ambient_websocket_forbidden/u,
    "reviewed module must not use ambient WebSocket network authority",
  );
}

const processEventName="__void_reviewed_ambient_process_event_escape_v1";
delete globalThis.__VOID_REVIEWED_PROCESS_EVENT_ESCAPE_V1;
await testOnlyImportSyntheticReviewedModuleV1(
  'process.once("'+processEventName+'",()=>{'+
  'fetch("data:text/plain,event-escape");'+
  'globalThis.__VOID_REVIEWED_PROCESS_EVENT_ESCAPE_V1=true;'+
  '}); export default true;',
);
assert.throws(
  ()=>process.emit(processEventName),
  /reviewed_ambient_fetch_forbidden/u,
  "ambient process event callbacks must remain fenced after reviewed import",
);
assert.equal(
  globalThis.__VOID_REVIEWED_PROCESS_EVENT_ESCAPE_V1,
  undefined,
);
delete globalThis.__VOID_REVIEWED_PROCESS_EVENT_ESCAPE_V1;

assert.throws(
  ()=>globalThis.fetch("data:text/plain,process-lifetime-fence"),
  /reviewed_ambient_fetch_forbidden/u,
  "dedicated broadcaster process must keep ambient fetch unavailable",
);
if(typeof process.getBuiltinModule==="function"){
  assert.throws(
    ()=>process.getBuiltinModule("node:net"),
    /reviewed_ambient_get_builtin_module_forbidden/u,
    "dedicated broadcaster process must keep direct builtin access unavailable",
  );
}
if(typeof globalThis.WebSocket==="function"){
  assert.throws(
    ()=>new globalThis.WebSocket("ws://127.0.0.1:9"),
    /reviewed_ambient_websocket_forbidden/u,
    "ambient WebSocket remains unavailable for the broadcaster process lifetime",
  );
}
assert.match(reviewedPlan.closure_aggregate_sha256,/^[0-9a-f]{64}$/u);
assert.ok(reviewedPlan.closure.includes(REVIEWED_TOOL_REL));

const reviewedHead=testOnlyReviewedGitHeadV1();
assert.match(reviewedHead,/^[0-9a-f]{40}$/u);

const reviewedLauncher=
  testOnlyReadExactHeadSourceV1(REVIEWED_LAUNCHER_REL);
assert.match(reviewedLauncher.blob,/^[0-9a-f]{40}$/u);
assert.match(reviewedLauncher.sha256,/^[0-9a-f]{64}$/u);

const reviewedLauncherText=reviewedLauncher.bytes.toString("utf8");
assert.match(
  reviewedLauncherText,
  /rpc_total_deadline_exceeded/u,
  "launcher RPC must preserve an independent total deadline",
);
for(const relativePath of REVIEWED_NETWORK_MODULES){
  const reviewedNetworkSource=
    testOnlyReadExactHeadSourceV1(relativePath).bytes.toString("utf8");
  assert.match(
    reviewedNetworkSource,
    /rpc_total_deadline_exceeded/u,
    relativePath+" must preserve an independent total RPC deadline",
  );
  assert.match(
    reviewedNetworkSource,
    /rpc_response_aborted/u,
    relativePath+" must settle an aborted RPC response",
  );
  assert.match(
    reviewedNetworkSource,
    /rpc_response_premature_close/u,
    relativePath+" must settle a premature RPC response close",
  );
}
assert.match(
  reviewedLauncherText,
  /rpc_response_aborted/u,
  "launcher RPC must settle an aborted response",
);
assert.match(
  reviewedLauncherText,
  /rpc_response_premature_close/u,
  "launcher RPC must settle a premature response close",
);

{
  const direct=spawnSync(
    process.execPath,
    [path.resolve(REVIEWED_LAUNCHER_REL)],
    {
      cwd:process.cwd(),
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
    },
  );
  assert.notEqual(direct.status,0);
  assert.match(
    direct.stderr,
    /reviewed_git_object_bootstrap_required/u,
  );
}

{
  const streamed=spawnSync(
    process.execPath,
    ["--input-type=module","-"],
    {
      cwd:process.cwd(),
      input:reviewedLauncher.bytes,
      encoding:"utf8",
      stdio:["pipe","pipe","pipe"],
      env:{
        PATH:"/usr/bin:/bin",
        LANG:"C",
        LC_ALL:"C",
        VOID_DATANET_REGISTRY_REVIEWED_LAUNCHER_BLOB_SHA1:
          reviewedLauncher.blob,
      },
    },
  );
  assert.notEqual(streamed.status,0);
  assert.match(
    streamed.stderr,
    /legacy_same_process_execution_retired_use_isolated_launcher/u,
    "legacy same-process exact-Git-object execution must be retired in favor of the isolated launcher",
  );

  const contaminated=spawnSync(
    process.execPath,
    ["--input-type=module","-"],
    {
      cwd:process.cwd(),
      input:reviewedLauncher.bytes,
      encoding:"utf8",
      stdio:["pipe","pipe","pipe"],
      env:{
        PATH:"/usr/bin:/bin",
        LANG:"C",
        LC_ALL:"C",
        NODE_OPTIONS:"--no-warnings",
        VOID_DATANET_REGISTRY_REVIEWED_LAUNCHER_BLOB_SHA1:
          reviewedLauncher.blob,
      },
    },
  );
  assert.notEqual(contaminated.status,0);
  assert.match(
    contaminated.stderr,
    /reviewed_bootstrap_environment_not_sanitized/u,
  );
}

{
  const saved=new Map(
    ["PATH","HOME","XDG_CONFIG_HOME","GIT_CONFIG_GLOBAL","GIT_CONFIG_SYSTEM",
      "GIT_CONFIG_NOSYSTEM","GIT_ATTR_NOSYSTEM","GIT_NO_REPLACE_OBJECTS",
      "GIT_OPTIONAL_LOCKS","GIT_TERMINAL_PROMPT"]
      .map((key)=>[key,process.env[key]]),
  );
  try{
    process.env.PATH="/tmp/void-malicious-bin";
    process.env.HOME="/tmp/void-malicious-home";
    process.env.XDG_CONFIG_HOME="/tmp/void-malicious-xdg";
    process.env.GIT_CONFIG_GLOBAL="/tmp/void-malicious-global";
    process.env.GIT_CONFIG_SYSTEM="/tmp/void-malicious-system";
    process.env.GIT_CONFIG_NOSYSTEM="0";
    process.env.GIT_ATTR_NOSYSTEM="0";
    process.env.GIT_NO_REPLACE_OBJECTS="0";
    process.env.GIT_OPTIONAL_LOCKS="1";
    process.env.GIT_TERMINAL_PROMPT="1";
    assert.equal(testOnlyReviewedGitHeadV1(),reviewedHead);
  }finally{
    for(const [key,value] of saved){
      if(value===undefined) delete process.env[key];
      else process.env[key]=value;
    }
  }
}

{
  const worktreeFile=path.resolve(REVIEWED_TOOL_REL);
  const original=fs.readFileSync(worktreeFile);
  const marker="\n// VOID_REVIEWED_SOURCE_ASSUME_UNCHANGED_SENTINEL\n";
  const mark=spawnSync(
    "/usr/bin/git",
    ["update-index","--assume-unchanged","--",REVIEWED_TOOL_REL],
    {cwd:process.cwd(),encoding:"utf8"},
  );
  assert.equal(mark.status,0,mark.stderr);
  try{
    fs.appendFileSync(worktreeFile,marker,"utf8");
    const reviewed=testOnlyReadExactHeadSourceV1(REVIEWED_TOOL_REL);
    assert.equal(reviewed.blob.length,40);
    assert.equal(reviewed.bytes.equals(original),true);
    assert.equal(
      reviewed.bytes.includes(
        Buffer.from("VOID_REVIEWED_SOURCE_ASSUME_UNCHANGED_SENTINEL","utf8"),
      ),
      false,
    );
  }finally{
    fs.writeFileSync(worktreeFile,original);
    const clear=spawnSync(
      "/usr/bin/git",
      ["update-index","--no-assume-unchanged","--",REVIEWED_TOOL_REL],
      {cwd:process.cwd(),encoding:"utf8"},
    );
    assert.equal(clear.status,0,clear.stderr);
  }
}

{
  const launcherFile=path.resolve(REVIEWED_LAUNCHER_REL);
  const original=fs.readFileSync(launcherFile);
  const marker=
    "\n// VOID_REVIEWED_LAUNCHER_ASSUME_UNCHANGED_SENTINEL\n";
  const mark=spawnSync(
    "/usr/bin/git",
    ["update-index","--assume-unchanged","--",REVIEWED_LAUNCHER_REL],
    {cwd:process.cwd(),encoding:"utf8"},
  );
  assert.equal(mark.status,0,mark.stderr);
  try{
    fs.appendFileSync(launcherFile,marker,"utf8");
    const reviewed=
      testOnlyReadExactHeadSourceV1(REVIEWED_LAUNCHER_REL);
    assert.equal(reviewed.bytes.equals(original),true);
    assert.equal(
      reviewed.bytes.includes(
        Buffer.from(
          "VOID_REVIEWED_LAUNCHER_ASSUME_UNCHANGED_SENTINEL",
          "utf8",
        ),
      ),
      false,
    );
  }finally{
    fs.writeFileSync(launcherFile,original);
    const clear=spawnSync(
      "/usr/bin/git",
      ["update-index","--no-assume-unchanged","--",REVIEWED_LAUNCHER_REL],
      {cwd:process.cwd(),encoding:"utf8"},
    );
    assert.equal(clear.status,0,clear.stderr);
  }
}

{
  const parent=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-registry-reviewed-source-proof-"),
  );
  const destination=path.join(parent,"reviewed");
  try{
    const materialized=testOnlyMaterializeReviewedSourcesV1(destination);
    assert.equal(materialized.verification.closure_count,27);
    const privateTool=path.join(
      destination,
      ...REVIEWED_TOOL_REL.split("/"),
    );
    fs.chmodSync(privateTool,0o600);
    fs.appendFileSync(
      privateTool,
      "\n// VOID_PRIVATE_REVIEWED_SOURCE_DRIFT_SENTINEL\n",
      "utf8",
    );
    assert.throws(
      ()=>testOnlyVerifyReviewedSourcesV1(
        materialized.plan,
        destination,
      ),
      /reviewed_private_source_mismatch/u,
    );
  }finally{
    fs.rmSync(parent,{recursive:true,force:true});
  }
}

let reviewedAbaExecution;
let reviewedExecution;
let reviewedAuthorityRecheck;
let reviewedPreparationHttpCalls=0;
const originalHttpRequest=http.request;
http.request=(...args)=>{
  reviewedPreparationHttpCalls+=1;
  throw new Error(
    "reviewed_preparation_unexpected_http_request:"+
    String(args[0]??""),
  );
};
syncBuiltinESMExports();
try{
  reviewedAbaExecution=
    await testOnlyPrepareReviewedExecutionPrivateTreeAbaV1();
  reviewedExecution=await testOnlyPrepareReviewedExecutionV1();
  reviewedAuthorityRecheck=
    await testOnlyPrepareAndRecheckReviewedAuthorityV1();
}finally{
  http.request=originalHttpRequest;
  syncBuiltinESMExports();
}
assert.equal(
  reviewedPreparationHttpCalls,
  0,
  "reviewed source/package preparation and module import must not invoke either approved HTTP observer transport",
);
assert.equal(
  reviewedAuthorityRecheck.before.launcher_git_blob_sha1,
  reviewedLauncher.blob,
);
assert.equal(
  reviewedAuthorityRecheck.before.test_only_current_checkout,
  true,
);
assert.equal(
  reviewedAuthorityRecheck.after.test_only_current_checkout,
  true,
);
assert.equal(
  reviewedAuthorityRecheck.after.launcher_git_blob_sha1,
  reviewedLauncher.blob,
);
assert.equal(
  reviewedAuthorityRecheck.before.head,
  reviewedAuthorityRecheck.after.head,
);
assert.equal(
  reviewedAuthorityRecheck.before.tree,
  reviewedAuthorityRecheck.after.tree,
);
assert.equal(
  reviewedAuthorityRecheck.binding.repository_head_sha,
  reviewedHead,
);
assert.equal(
  reviewedAuthorityRecheck.transaction_submission_performed,
  false,
);
assert.equal(reviewedAuthorityRecheck.rpc_send_invocation_count,0);

const launcherSource=fs.readFileSync(
  REVIEWED_LAUNCHER_REL,
  "utf8",
);
assert.match(
  launcherSource,
  /const authority=reviewedGitAuthorityV1\(\s*bootstrap\.launcher_git_blob_sha1,\s*\);/u,
  "production bootstrap must still require canonical reviewed Git authority",
);
assert.match(
  launcherSource,
  /const authorityAfterPreparation=reviewedGitAuthorityV1\(\s*authority\.launcher_git_blob_sha1,\s*\);/u,
  "production post-preparation check must still use canonical reviewed Git authority and the pinned launcher blob",
);

assert.equal(reviewedExecution.repository_head_sha,reviewedHead);
assert.equal(reviewedExecution.closure_count,27);
assert.deepEqual(reviewedExecution.bare_packages,["ethers"]);
assert.deepEqual(
  reviewedExecution.network_capable_modules,
  REVIEWED_NETWORK_MODULES,
);
assert.match(
  reviewedExecution.reviewed_runtime_profile_id,
  /^voidrnpr1_[0-9a-f]{64}$/u,
);
assert.match(
  reviewedExecution.reviewed_runtime_packages_aggregate_sha256,
  /^[0-9a-f]{64}$/u,
);
assert.equal(reviewedExecution.private_exact_head_tree,true);
assert.equal(reviewedExecution.private_tree_execution,false);
assert.equal(reviewedExecution.in_memory_exact_head_execution,true);
assert.equal(
  reviewedExecution.private_tree_aba_sentinel_observed,
  false,
);
assert.match(
  reviewedExecution.reviewed_ethers_standalone_sha256,
  /^[0-9a-f]{64}$/u,
);
assert.ok(reviewedExecution.reviewed_ethers_standalone_bytes>0);
assert.equal(
  reviewedAbaExecution.private_tree_aba_sentinel_observed,
  false,
  "private-tree ABA mutation must not become executable module code",
);
assert.equal(
  reviewedAbaExecution.in_memory_exact_head_execution,
  true,
);
assert.equal(reviewedExecution.execution_network_isolation_provided,false);

const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-registry-broadcast-exec-v1-"));
fs.chmodSync(root,0o700);
const consumedDir=path.join(root,"broadcast-consumed");
fs.mkdirSync(consumedDir,{mode:0o700});
fs.chmodSync(consumedDir,0o700);

const now=Date.parse("2030-01-01T00:00:30.000Z");
const request={
  broadcast_authorization_request_id:"voiddrbar1_"+"1".repeat(64),
};
const transactionSummary={
  transaction_type:2,
  chain_id:"2050",
  nonce:"0",
  from_address:"0x"+"2".repeat(40),
  to_address:null,
  value_wei:"0",
  gas_limit:"846479",
  max_fee_per_gas_wei:"0",
  max_priority_fee_per_gas_wei:"0",
  predicted_contract_address:"0x"+"3".repeat(40),
  data_sha256:"4".repeat(64),
  data_keccak256:"0x"+"5".repeat(64),
  unsigned_transaction_hash:"0x"+"6".repeat(64),
  signed_transaction_hash:"0x"+"7".repeat(64),
  signed_serialized_transaction_sha256:"8".repeat(64),
};
const authorization={
  broadcast_authorization_id:"voiddrba1_"+"9".repeat(64),
  broadcast_authorization_request_id:request.broadcast_authorization_request_id,
  signed_transaction_id:"voiddrstx1_"+"a".repeat(64),
  candidate_id:"voiddrtxc1_"+"b".repeat(64),
  transaction_fingerprint_sha256:"c".repeat(64),
  deployer_address:transactionSummary.from_address,
  signed_at_utc:"2030-01-01T00:00:00.000Z",
  authorized_at_utc:"2030-01-01T00:00:10.000Z",
  valid_until_utc:"2030-01-01T00:05:00.000Z",
  transaction_summary:transactionSummary,
  required_confirmation:"authorizeDatanetRegistryDeploymentBroadcastV1:test",
};
const observation={
  prebroadcast_observation_id:"voiddrpbo1_"+"d".repeat(64),
  broadcast_authorization_id:authorization.broadcast_authorization_id,
  signed_transaction_id:authorization.signed_transaction_id,
  signed_transaction_hash:transactionSummary.signed_transaction_hash,
  observed_at_utc:"2030-01-01T00:00:20.000Z",
  valid_until_utc:"2030-01-01T00:02:20.000Z",
};
const signed={
  signed_transaction_id:authorization.signed_transaction_id,
  signed_transaction_hash:transactionSummary.signed_transaction_hash,
  candidate_id:authorization.candidate_id,
  transaction_fingerprint_sha256:authorization.transaction_fingerprint_sha256,
  signed_serialized_transaction:"0x02deadbeef",
};

const operationId=voidDatanetRegistryBroadcastOperationIdV1(authorization);
const big=fs.lstatSync(root,{bigint:true});
const material={
  marker:"VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1",
  version:1,
  status:"BROADCAST_AUTHORIZATION_CONSUMED_BROADCASTER_ACCESS_HOLD",
  broadcast_operation_id:operationId,
  broadcast_authorization_id:authorization.broadcast_authorization_id,
  broadcast_authorization_request_id:authorization.broadcast_authorization_request_id,
  prebroadcast_observation_id:observation.prebroadcast_observation_id,
  signed_transaction_id:authorization.signed_transaction_id,
  signed_transaction_hash:transactionSummary.signed_transaction_hash,
  candidate_id:authorization.candidate_id,
  transaction_fingerprint_sha256:authorization.transaction_fingerprint_sha256,
  authorized_at_utc:authorization.authorized_at_utc,
  authorization_valid_until_utc:authorization.valid_until_utc,
  observed_at_utc:observation.observed_at_utc,
  observation_valid_until_utc:observation.valid_until_utc,
  consumed_at_utc:"2030-01-01T00:00:25.000Z",
  state_store_realpath_sha256:sha256(root),
  state_store_root_dev:String(big.dev),
  state_store_root_ino:String(big.ino),
  transaction_summary:transactionSummary,
  consumption:{
    exact_single_transaction:true,
    exact_signed_transaction_only:true,
    one_submission_attempt_only:true,
    single_use:true,
    authorization_consumed:true,
    immutable_consumption_record:true,
    stable_broadcast_operation_slot:true,
    state_store_generation_bound:true,
    descriptor_relative_publication:true,
    replay_rejected_within_exact_state_store_generation:true,
    replay_prevention_scope:"exact_state_store_generation_and_broadcast_operation",
    global_replay_prevention_claimed:false,
    authorization_expiry_rechecked_at_entry:true,
    authorization_expiry_rechecked_before_publication:true,
    prebroadcast_freshness_rechecked_at_entry:true,
    prebroadcast_freshness_rechecked_before_publication:true,
    consumption_precedes_any_broadcaster_access:true,
    signed_transaction_hash_bound:true,
  },
  authority:{
    filesystem_mutation_performed:true,
    signed_transaction_bytes_accessed:false,
    credential_access_performed:false,
    private_key_access_performed:false,
    broadcaster_access_authorized_by_this_gate:false,
    broadcaster_access_performed:false,
    rpc_call_performed:false,
    transaction_submission_authorized_by_this_gate:false,
    transaction_submission_performed:false,
    transaction_broadcast_authorized_by_this_gate:false,
    transaction_broadcast_performed:false,
    deployment_authorized:false,
    deployment_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
    automatic_retry:false,
  },
  next_gate:"exact_single_attempt_registry_broadcast_execution_after_consumption_v1",
};
const record={
  ...material,
  consumption_record_id:"voiddrbac1_"+sha256(Buffer.from(canonicalJson(material))),
};
const consumedFile=path.join(consumedDir,operationId+".json");
fs.writeFileSync(consumedFile,JSON.stringify(record,null,2)+"\n",{mode:0o600});
fs.chmodSync(consumedFile,0o600);

function writeConsumptionForRoot(targetRoot){
  const targetConsumedDir=path.join(targetRoot,"broadcast-consumed");
  fs.mkdirSync(targetConsumedDir,{mode:0o700});
  fs.chmodSync(targetConsumedDir,0o700);
  const targetBig=fs.lstatSync(targetRoot,{bigint:true});
  const targetMaterial={
    ...material,
    state_store_realpath_sha256:sha256(targetRoot),
    state_store_root_dev:String(targetBig.dev),
    state_store_root_ino:String(targetBig.ino),
  };
  const targetRecord={
    ...targetMaterial,
    consumption_record_id:
      "voiddrbac1_"+sha256(Buffer.from(canonicalJson(targetMaterial))),
  };
  const targetFile=path.join(targetConsumedDir,operationId+".json");
  fs.writeFileSync(
    targetFile,
    JSON.stringify(targetRecord,null,2)+"\n",
    {mode:0o600},
  );
  fs.chmodSync(targetFile,0o600);
  return targetRecord;
}

let sendCount=0;
const dependencies={
  validate_runtime:()=>({request,authorization}),
  validate_observation:()=>observation,
  validate_signed_transaction:()=>signed,
  now:()=>now,
  rpc:async (method)=>{
    if(method==="eth_sendRawTransaction"){
      sendCount+=1;
      return transactionSummary.signed_transaction_hash;
    }
    if(method==="eth_getTransactionByHash"){
      return {hash:transactionSummary.signed_transaction_hash};
    }
    if(method==="eth_getTransactionReceipt") return null;
    if(method==="eth_getCode") return "0x";
    if(method==="eth_getTransactionCount") return "0x1";
    throw new Error("unexpected_rpc_method:"+method);
  },
};

try{
  const wrongConfirmation=
    await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
      {
        broadcast_request:request,
        broadcast_authorization:authorization,
        prebroadcast_observation:observation,
        signed_transaction:signed,
        state_dir:root,
        confirmation:"wrong-confirmation",
      },
      dependencies,
    );
  assert.equal(wrongConfirmation.ok,false);
  assert.equal(
    wrongConfirmation.reason,
    "registry_broadcast_execution_exact_operation_confirmation_required",
  );
  assert.equal(wrongConfirmation.rpc_send_invocation_count,0);
  assert.equal(sendCount,0);
  assert.equal(
    fs.existsSync(path.join(root,"broadcast-attempts")),
    false,
    "wrong confirmation mutated attempt state",
  );

  const preSendRoot=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-registry-broadcast-presend-v1-"),
  );
  fs.chmodSync(preSendRoot,0o700);
  try{
    writeConsumptionForRoot(preSendRoot);
    let nowCall=0;
    let preSendRpcCalls=0;
    const expiredAtFinalGate=Date.parse("2030-01-01T00:05:00.000Z");
    const preSendDependencies={
      ...dependencies,
      now:()=>{
        nowCall+=1;
        return nowCall<=2 ? now : expiredAtFinalGate;
      },
      rpc:async ()=>{
        preSendRpcCalls+=1;
        throw new Error("rpc_must_not_run_after_final_gate_hold");
      },
    };
    const heldAtFinalGate=
      await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
        {
          broadcast_request:request,
          broadcast_authorization:authorization,
          prebroadcast_observation:observation,
          signed_transaction:signed,
          state_dir:preSendRoot,
          confirmation:authorization.required_confirmation,
        },
        preSendDependencies,
      );
    assert.equal(heldAtFinalGate.ok,false);
    assert.equal(
      heldAtFinalGate.reason,
      "registry_broadcast_execution_final_pre_send_gate_failed",
    );
    assert.equal(heldAtFinalGate.rpc_send_invocation_count,0);
    assert.equal(heldAtFinalGate.transaction_submission_performed,false);
    assert.equal(heldAtFinalGate.transaction_broadcast_performed,false);
    assert.equal(heldAtFinalGate.attempt_intent_recorded,true);
    assert.equal(preSendRpcCalls,0);
    assert.equal(
      fs.existsSync(
        path.join(
          preSendRoot,
          "broadcast-attempts",
          operationId+".intent.json",
        ),
      ),
      true,
      "final-gate hold must leave durable spent-attempt intent",
    );
  }finally{
    fs.rmSync(preSendRoot,{recursive:true,force:true});
  }

  const first=await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
    {
      broadcast_request:request,
      broadcast_authorization:authorization,
      prebroadcast_observation:observation,
      signed_transaction:signed,
      state_dir:root,
      confirmation:authorization.required_confirmation,
    },
    dependencies,
  );
  assert.equal(first.ok,true);
  assert.equal(first.rpc_send_invocation_count,1);
  assert.equal(first.transaction_submission_performed,true);
  assert.equal(first.transaction_broadcast_performed,true);
  assert.equal(sendCount,1);
  assert.equal(first.automatic_retry_performed,false);
  assert.equal(first.replacement_transaction_created,false);
  assert.equal(
    first.classification,
    "TRANSACTION_SEEN_RECEIPT_PENDING_NO_RETRY_RECONCILE",
  );

  const second=await submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
    {
      broadcast_request:request,
      broadcast_authorization:authorization,
      prebroadcast_observation:observation,
      signed_transaction:signed,
      state_dir:root,
      confirmation:authorization.required_confirmation,
    },
    dependencies,
  );
  assert.equal(second.ok,false);
  assert.equal(
    second.reason,
    "registry_broadcast_execution_attempt_already_recorded",
  );
  assert.equal(second.rpc_send_invocation_count,0);
  assert.equal(sendCount,1);

  const attempts=path.join(root,"broadcast-attempts");
  const files=fs.readdirSync(attempts).sort();
  assert.deepEqual(files,[
    operationId+".intent.json",
    operationId+".result.json",
  ]);
  for(const name of files){
    assert.equal(fs.lstatSync(path.join(attempts,name)).mode&0o777,0o600);
  }

  const toolSource=fs.readFileSync(
    "tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs",
    "utf8",
  );
  const packageRuntimeSource=fs.readFileSync(
    "tools/void-datanet-reviewed-node-package-runtime-v1.mjs",
    "utf8",
  );
  assert.match(
    packageRuntimeSource,
    /reviewedHead="HEAD"/u,
    "reviewed package-runtime APIs must accept an explicit reviewed head",
  );
  assert.match(
    packageRuntimeSource,
    /collectInternal\(repoRoot,profile\.root_packages,reviewedHead\)/u,
    "reviewed package verification/materialization must bind collection to the explicit reviewed head",
  );
  const runnerSource=fs.readFileSync(
    "ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs",
    "utf8",
  );
  for(const required of [
    "SINGLE_BROADCAST_ATTEMPT_INTENT_DURABLE_BEFORE_RPC",
    "eth_sendRawTransaction",
    "registry_broadcast_execution_attempt_already_recorded",
    "registry_broadcast_execution_exact_operation_confirmation_required",
    "registry_broadcast_execution_final_pre_send_gate_failed",
    "fsyncDir(parent);",
    "automatic_retry_performed:false",
    "replacement_transaction_created:false",
  ]){
    assert.ok(toolSource.includes(required),required);
  }
  assert.ok(
    runnerSource.includes("exact_operation_bound_broadcast_confirmation_required"),
  );
  assert.ok(
    runnerSource.includes("confirmation:args.confirmation"),
    "runner must pass confirmation into dangerous API boundary",
  );
  assert.ok(
    runnerSource.includes('const req=http.request({'),
    "reviewed loopback RPC must use the fixed node:http request transport",
  );
  assert.ok(
    runnerSource.includes('finish(new Error("rpc_http_status_"+String(res.statusCode)))'),
    "reviewed loopback RPC must reject every non-2xx response",
  );
  let redirectTargetRequests=0;
  const redirectTarget=http.createServer((_req,res)=>{
    redirectTargetRequests+=1;
    res.writeHead(200,{"content-type":"application/json"});
    res.end('{"jsonrpc":"2.0","id":1,"result":"0x"}');
  });
  await new Promise((resolve,reject)=>{
    redirectTarget.once("error",reject);
    redirectTarget.listen(0,"127.0.0.1",resolve);
  });
  const targetAddress=redirectTarget.address();
  assert.ok(targetAddress&&typeof targetAddress!=="string");

  let reviewedEndpointRequests=0;
  const redirectingRpc=http.createServer((_req,res)=>{
    reviewedEndpointRequests+=1;
    res.writeHead(302,{
      location:"http://127.0.0.1:"+String(targetAddress.port)+"/redirect-target",
      "content-type":"text/plain",
    });
    res.end("redirect denied\n");
  });

  try{
    await new Promise((resolve,reject)=>{
      redirectingRpc.once("error",reject);
      redirectingRpc.listen(18553,"127.0.0.1",resolve);
    });
    const reviewedRpc=testOnlyRpcFactoryV1();
    await assert.rejects(
      ()=>reviewedRpc("eth_getCode",["0x"+"11".repeat(20),"latest"]),
      /rpc_http_status_302/u,
      "reviewed RPC transport must reject 3xx and must not follow Location",
    );
    assert.equal(reviewedEndpointRequests,1);
    await new Promise((resolve)=>setTimeout(resolve,50));
    assert.equal(
      redirectTargetRequests,
      0,
      "reviewed RPC transport must never issue the redirected request",
    );
  }finally{
    await Promise.all([
      new Promise((resolve)=>redirectingRpc.close(()=>resolve())),
      new Promise((resolve)=>redirectTarget.close(()=>resolve())),
    ]);
  }

  const truncatedRpc=http.createServer((_req,res)=>{
    res.writeHead(200,{
      "content-type":"application/json",
      "content-length":"256",
    });
    res.write('{"jsonrpc":"2.0","id":1,"result":"0x');
    res.socket?.destroy();
  });
  try{
    await new Promise((resolve,reject)=>{
      truncatedRpc.once("error",reject);
      truncatedRpc.listen(18553,"127.0.0.1",resolve);
    });
    const reviewedRpc=testOnlyRpcFactoryV1();
    await assert.rejects(
      Promise.race([
        reviewedRpc("eth_getCode",["0x"+"22".repeat(20),"latest"]),
        new Promise((_,reject)=>setTimeout(
          ()=>reject(new Error("truncated_rpc_test_timeout")),
          1500,
        )),
      ]),
      (error)=>{
        const message=String(error?.message||"");
        return (
          error?.code==="ECONNRESET"||
          /rpc_response_(?:aborted|premature_close)/u.test(message)
        );
      },
      "truncated RPC response must reject promptly instead of hanging",
    );
  }finally{
    await new Promise((resolve)=>truncatedRpc.close(()=>resolve()));
  }

  assert.doesNotMatch(
    runnerSource,
    /from\s+["']\.\.\/\.\.\/tools\//u,
    "Precision bootstrap must not statically execute mutable worktree tools",
  );
  assert.equal(
    runnerSource.includes('spawnSync("git"'),
    false,
    "Precision bootstrap must not invoke ambient git by PATH",
  );
  for(const required of [
    'const GIT="/usr/bin/git"',
    'GIT_CONFIG_GLOBAL:"/dev/null"',
    'GIT_CONFIG_SYSTEM:"/dev/null"',
    'GIT_NO_REPLACE_OBJECTS:"1"',
    '"ls-remote",CANONICAL_REMOTE,"refs/heads/main"',
    "local_head_not_canonical_remote_main",
    "reviewed_git_object_bootstrap_required",
    "reviewed_bootstrap_environment_not_sanitized",
    "reviewed_launcher_git_blob_mismatch",
    "authority.launcher_git_blob_sha1",
    "testOnlyPrepareAndRecheckReviewedAuthorityV1",
    "VOID_DATANET_REGISTRY_REVIEWED_LAUNCHER_BLOB_SHA1",
    "reviewed_source_closure_mismatch",
    "reviewedHead:head",
    "globalThis\\.fetch",
    "registerReviewedModuleGraphV1",
    "registerExactReviewedFileModuleV1",
    "reviewedEthersStandaloneBundleV1",
    "in_memory_exact_head_execution=true",
    "private_tree_execution=false",
    "execution_network_isolation_provided=false",
  ]){
    assert.ok(runnerSource.includes(required),required);
  }
  for(const forbidden of [
    "SigningKey",
    "Wallet(",
    "privateKey",
    "createPrivateKey",
    "eth_sendTransaction",
    "systemctl",
    "docker ",
    "ssh ",
  ]){
    assert.equal(toolSource.includes(forbidden),false,forbidden);
  }

  console.log("reviewed_process_execve_forbidden=true");
console.log("reviewed_rpc_3xx_rejected_without_redirect_follow=true");
console.log("VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1_PROOF_GREEN");
  console.log("durable_attempt_intent_before_rpc=true");
  console.log("eth_sendRawTransaction_maximum_invocations_per_attempt=1");
  console.log("duplicate_invocation_rpc_send_count=0");
  console.log("exact_consumption_record_required=true");
  console.log("runtime_expiry_rechecked=true");
  console.log("final_pre_send_hold_returns_error=true");
  console.log("final_pre_send_hold_rpc_calls=0");
  console.log("operation_bound_confirmation_enforced_in_submit_api=true");
  console.log("attempt_directory_parent_fsynced_before_rpc=true");
  console.log("rpc_redirects_rejected=true");
  console.log("state_root_generation_rechecked=true");
  console.log("signed_transaction_exactly_bound=true");
  console.log("automatic_retry=false");
  console.log("replacement_transaction=false");
  console.log("credential_access=false");
  console.log("private_key_access=false");
  console.log("canonical_remote_main_equality_required=true");
  console.log("absolute_isolated_git_required=true");
  console.log("reviewed_source_closure_count=27");
  console.log("reviewed_launcher_direct_path_execution_rejected=true");
  console.log("reviewed_launcher_exact_git_object_stream_required=true");
  console.log("reviewed_launcher_ambient_loader_environment_rejected=true");
  console.log("reviewed_launcher_hidden_worktree_drift_excluded=true");
  console.log("reviewed_source_hidden_worktree_drift_excluded=true");
  console.log("reviewed_private_source_drift_rejected=true");
  console.log("reviewed_private_tree_aba_execution_excluded=true");
  console.log("reviewed_runtime_helper_in_memory=true");
  console.log("reviewed_source_graph_in_memory=true");
  console.log("reviewed_ethers_standalone_in_memory=true");
  console.log("reviewed_ethers_runtime_verified=true");
  console.log("reviewed_network_capable_module_count=2");
  console.log("reviewed_preparation_http_calls=0");
  console.log("reviewed_preparation_global_fetch_calls=0");
  console.log("reviewed_post_preparation_authority_recheck=true");
  console.log("reviewed_post_preparation_launcher_blob_bound=true");
  console.log("execution_network_isolation_provided=false");
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
