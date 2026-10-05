#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1 =
  "VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1";

export const VOID_PRECISION_WEB_RECOVERY_AUTHORITY_V1 = Object.freeze({
  source_only_plan:true,
  external_observation_verification:true,
  clean_repository_required:true,
  exact_source_blobs_required:true,
  host_execution:false,
  installation_authorized:false,
  service_mutation_authorized:false,
  routing_mutation_authorized:false,
  dns_mutation_authorized:false,
  tailscale_mutation_authorized:false,
  node_restart_authorized:false,
  credential_access:false,
  wallet_or_signer_access:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_broadcast:false,
  validator_mutation:false,
  work_credit_mutation:false,
  funds_movement:false,
  independent_acceptance:false,
});

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const HEX40=/^[0-9a-f]{40}$/u;
const GIT_EXECUTABLE="/usr/bin/git";
const GIT_REPOSITORY_ENV=Object.freeze([
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_NAMESPACE",
  "GIT_REPLACE_REF_BASE",
]);
const GIT_PROGRAM_ENV=Object.freeze([
  "GIT_EXEC_PATH",
  "GIT_SSH",
  "GIT_SSH_COMMAND",
  "GIT_ASKPASS",
  "SSH_ASKPASS",
  "GIT_EXTERNAL_DIFF",
  "GIT_PAGER",
  "GIT_EDITOR",
  "GIT_SEQUENCE_EDITOR",
]);
const PLAN_ID=/^voidpwrp1_[0-9a-f]{64}$/u;
const EVIDENCE_ID=/^voidpwre1_[0-9a-f]{64}$/u;

const SOURCE_BLOBS=Object.freeze({
  "ops/public/public-seed-adapter-v1.mjs":
    "60158fa63c7fafc55738d4b5a021cc021983812a",
  "ops/public/run-public-seed-adapter-v1.sh":
    "bc5f5d8c277c114b007a5676015729ec25fc09dd",
  "ops/public/void-public-app-composition-gateway-v1.mjs":
    "caaaebb8da9e21cf9ac1c429865c931400cb0526",
  "ops/public/run-void-public-app-composition-gateway-v1.sh":
    "e9b74924304985d87e00972db61f29a607f19124",
  "ops/systemd/user/void-public-app-composition-gateway-v1.service.example":
    "d7add3da6d34bece418084c877cd4be667495ffb",
  "ops/public/void-public-frontdoor-v1.mjs":
    "b1513ea822e32fe5df55c00ab635128b07aaf170",
  "ops/public/void-public-frontdoor-cutover-v1.sh":
    "2545917778513e31da2291f70734801e1639ee36",
  "public/void-public-frontdoor-v1/index.html":
    "19b09b0be6d8b7841855e0e86103f5fb0f56efac",
});

const PLAN_KEYS=Object.freeze([
  "marker","version","status","source_head_sha","source_tree_sha",
  "tool_git_blob_sha1","source_blobs","source_file_sha256",
  "topology","service_profile","runtime_expectations","recovery_order",
  "authority","plan_id",
]);
const EVIDENCE_KEYS=Object.freeze([
  "marker","version","status","plan_id","source_head_sha","source_tree_sha",
  "host_role","adapter","composition","frontdoor","service_hardening",
  "node_service_restart_performed","tailscale_routing_mutated","dns_mutated",
  "funnel_mutated","wallet_or_signer_accessed","transaction_performed",
  "funds_moved","observed_at_utc","evidence_id",
]);
const SERVICE_EVIDENCE_KEYS=Object.freeze([
  "active","listener","marker","source_file_sha256",
]);
const COMPOSITION_EVIDENCE_KEYS=Object.freeze([
  "active","listener","marker","runtime_truth_marker","strict_ready",
  "network_name","node_label","source_file_sha256",
]);
const FRONTDOOR_EVIDENCE_KEYS=Object.freeze([
  "active","listener","marker","ready","upstream_strict_ready",
  "upstream_marker","upstream_runtime_truth_marker","source_file_sha256",
]);
const HARDENING_KEYS=Object.freeze([
  "no_new_privileges","restrict_suid_sgid","lock_personality",
  "private_tmp","protect_home","protect_system",
]);

function fail(code){throw new Error(code);}

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function exactObject(value,keys,code){
  if(!plain(value)) fail(code);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null) fail(code);
  const actual=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(actual.length!==expected.length||actual.some((key,i)=>key!==expected[i])){
    fail(code);
  }
  return value;
}

function canonicalize(value){
  if(Array.isArray(value)) return value.map(canonicalize);
  if(plain(value)){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value){return JSON.stringify(canonicalize(value));}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}

function inspectGitExecutable(){
  let canonicalPath;
  let stat;
  let bytes;
  try{
    canonicalPath=fs.realpathSync(GIT_EXECUTABLE);
    stat=fs.statSync(canonicalPath);
    bytes=fs.readFileSync(canonicalPath);
  }catch{
    fail("precision_web_git_executable_unavailable");
  }
  if(
    !path.isAbsolute(canonicalPath)||
    !stat.isFile()||
    (stat.mode&0o111)===0
  ) fail("precision_web_git_executable_invalid");
  return Object.freeze({
    path:canonicalPath,
    sha256:sha256(bytes),
    filesystem_identity:[
      canonicalPath,
      String(stat.dev),
      String(stat.ino),
      String(stat.size),
      String(stat.mode&0o7777),
    ].join("\0"),
  });
}

function sameGitExecutable(left,right){
  return (
    left.path===right.path&&
    left.sha256===right.sha256&&
    left.filesystem_identity===right.filesystem_identity
  );
}

export function precisionWebRecoveryGitEnvV1(){
  return Object.freeze({
    PATH:"/usr/bin:/bin",
    HOME:"/nonexistent",
    XDG_CONFIG_HOME:"/nonexistent",
    LANG:"C",
    LC_ALL:"C",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_ATTR_NOSYSTEM:"1",
    GIT_TERMINAL_PROMPT:"0",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_NO_LAZY_FETCH:"1",
    GIT_NO_REPLACE_OBJECTS:"1",
  });
}

function sanitizedGitEnv(){
  return {...precisionWebRecoveryGitEnvV1()};
}

function git(args,code,{encoding="utf8"}={}){
  const before=inspectGitExecutable();
  const result=spawnSync(
    before.path,
    [
      "--no-replace-objects",
      "-c","core.hooksPath=/dev/null",
      "-c","core.attributesFile=/dev/null",
      "-c","core.fsmonitor=false",
      "-c","core.untrackedCache=false",
      "-c","core.preloadIndex=false",
      "-c","submodule.recurse=false",
      "-C",ROOT,
      ...args,
    ],
    {
      encoding,
      stdio:["ignore","pipe","pipe"],
      env:sanitizedGitEnv(),
      maxBuffer:4*1024*1024,
    },
  );
  if(result.error||result.status!==0) fail(code);
  const after=inspectGitExecutable();
  if(!sameGitExecutable(before,after)){
    fail("precision_web_git_executable_changed_during_read");
  }
  return encoding===null?Buffer.from(result.stdout):String(result.stdout).trim();
}

function gitText(relativePath,ref="HEAD"){
  return git(
    ["show",ref+":"+relativePath],
    "precision_web_source_read_failed:"+relativePath,
  );
}

function gitBytes(relativePath,ref="HEAD"){
  return git(
    ["show",ref+":"+relativePath],
    "precision_web_source_bytes_failed:"+relativePath,
    {encoding:null},
  );
}

function requireContains(text,tokens,code){
  for(const token of tokens){
    if(!text.includes(token)) fail(code+":"+token);
  }
}

function sourceGeneration(){
  const status=git(
    ["status","--porcelain=v1","--untracked-files=all"],
    "precision_web_repository_status_unavailable",
  );
  if(status!=="") fail("precision_web_repository_must_be_clean");
  const head=git(["rev-parse","HEAD"],"precision_web_head_unavailable");
  const tree=git(["rev-parse","HEAD^{tree}"],"precision_web_tree_unavailable");
  if(!HEX40.test(head)||!HEX40.test(tree)) fail("precision_web_repository_identity_invalid");

  const blobs={};
  const hashes={};
  for(const [relativePath,expectedBlob] of Object.entries(SOURCE_BLOBS)){
    const blob=git(
      ["rev-parse",head+":"+relativePath],
      "precision_web_source_blob_unavailable:"+relativePath,
    );
    if(blob!==expectedBlob) fail("precision_web_source_blob_mismatch:"+relativePath);
    blobs[relativePath]=blob;
    hashes[relativePath]=sha256(gitBytes(relativePath,head));
  }
  const toolPath="tools/void-precision-web-recovery-evidence-v1.mjs";
  const toolBlob=git(
    ["rev-parse",head+":"+toolPath],
    "precision_web_tool_blob_unavailable",
  );
  if(!HEX40.test(toolBlob)) fail("precision_web_tool_blob_invalid");
  return Object.freeze({
    source_head_sha:head,
    source_tree_sha:tree,
    tool_git_blob_sha1:toolBlob,
    source_blobs:Object.freeze(blobs),
    source_file_sha256:Object.freeze(hashes),
  });
}

function inspectCurrentSources(ref){
  const adapter=gitText("ops/public/public-seed-adapter-v1.mjs",ref);
  const adapterRunner=gitText("ops/public/run-public-seed-adapter-v1.sh",ref);
  const composition=gitText("ops/public/void-public-app-composition-gateway-v1.mjs",ref);
  const compositionRunner=gitText("ops/public/run-void-public-app-composition-gateway-v1.sh",ref);
  const compositionUnit=gitText(
    "ops/systemd/user/void-public-app-composition-gateway-v1.service.example",
    ref,
  );
  const frontdoor=gitText("ops/public/void-public-frontdoor-v1.mjs",ref);
  const cutover=gitText("ops/public/void-public-frontdoor-cutover-v1.sh",ref);
  const html=gitText("public/void-public-frontdoor-v1/index.html",ref);

  requireContains(adapter,[
    'process.env.VOID_SEED_UPSTREAM || "http://127.0.0.1:4100"',
    'process.env.VOID_ADAPTER_HOST || "127.0.0.1"',
    'process.env.VOID_ADAPTER_PORT || "4111"',
    'adapter: "void_public_seed_adapter"',
  ],"precision_web_adapter_contract_invalid");
  requireContains(adapterRunner,[
    'VOID_SEED_UPSTREAM="\${VOID_SEED_UPSTREAM:-http://127.0.0.1:4100}"',
    'VOID_ADAPTER_HOST="\${VOID_ADAPTER_HOST:-127.0.0.1}"',
  ],"precision_web_adapter_runner_invalid");
  requireContains(composition,[
    "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1",
    "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1",
  ],"precision_web_composition_contract_invalid");
  requireContains(compositionRunner,[
    'VOID_COMPOSITION_PORT="\${VOID_COMPOSITION_PORT:-8082}"',
    'VOID_PUBLIC_GATEWAY_UPSTREAM="\${VOID_PUBLIC_GATEWAY_UPSTREAM:-http://127.0.0.1:8080}"',
    'VOID_NODE_UPSTREAM="\${VOID_NODE_UPSTREAM:-http://127.0.0.1:4100}"',
  ],"precision_web_composition_runner_invalid");
  requireContains(compositionUnit,[
    "Environment=VOID_COMPOSITION_PORT=8082",
    "Environment=VOID_PUBLIC_GATEWAY_UPSTREAM=http://127.0.0.1:8080",
    "PrivateTmp=true",
    "ProtectSystem=strict",
    "ProtectHome=read-only",
  ],"precision_web_composition_example_invalid");
  requireContains(frontdoor,[
    'const MARKER = "VOID_PUBLIC_FRONTDOOR_V1"',
    'process.env.VOID_PUBLIC_FRONTDOOR_BIND || "127.0.0.1"',
    'process.env.VOID_PUBLIC_FRONTDOOR_PORT || "8083"',
    'process.env.VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT || "8082"',
    'const UPSTREAM_MARKER = "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1"',
    'const UPSTREAM_RUNTIME_TRUTH_MARKER = "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1"',
  ],"precision_web_frontdoor_contract_invalid");
  requireContains(cutover,[
    "NoNewPrivileges=true",
    "PrivateTmp=true",
    "RestrictSUIDSGID=true",
    "LockPersonality=true",
  ],"precision_web_frontdoor_cutover_profile_invalid");
  requireContains(html,["VOID_PUBLIC_FRONTDOOR_V1"],"precision_web_frontdoor_html_invalid");
}

function recoveryProfile(){
  return Object.freeze({
    adapter:Object.freeze({
      listener:"127.0.0.1:8080",
      upstream:"http://127.0.0.1:4100",
      marker:"void_public_seed_adapter",
      source:"ops/public/public-seed-adapter-v1.mjs",
    }),
    composition:Object.freeze({
      listener:"127.0.0.1:8082",
      public_gateway_upstream:"http://127.0.0.1:8080",
      node_upstream:"http://127.0.0.1:4100",
      marker:"VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1",
      runtime_truth_marker:"VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1",
      network_name:"Mainnet-0",
      node_label:"Precision public seed",
      source:"ops/public/void-public-app-composition-gateway-v1.mjs",
    }),
    frontdoor:Object.freeze({
      listener:"127.0.0.1:8083",
      upstream_port:8082,
      marker:"VOID_PUBLIC_FRONTDOOR_V1",
      source:"ops/public/void-public-frontdoor-v1.mjs",
    }),
  });
}

function serviceProfile(){
  const safe=Object.freeze({
    no_new_privileges:true,
    restrict_suid_sgid:true,
    lock_personality:true,
    private_tmp:false,
    protect_home:false,
    protect_system:false,
  });
  return Object.freeze({
    adapter:safe,
    composition:safe,
    frontdoor:safe,
    precision_descriptor_walk_compatibility_required:true,
    generic_example_mount_namespace_profile_adopted:false,
  });
}

function requireSourceGenerationStillCurrent(source){
  const status=git(
    ["status","--porcelain=v1","--untracked-files=all"],
    "precision_web_repository_status_recheck_unavailable",
  );
  const head=git(
    ["rev-parse","HEAD"],
    "precision_web_head_recheck_unavailable",
  );
  const tree=git(
    ["rev-parse","HEAD^{tree}"],
    "precision_web_tree_recheck_unavailable",
  );
  if(
    status!==""||
    head!==source.source_head_sha||
    tree!==source.source_tree_sha
  ){
    fail("precision_web_repository_changed_during_plan");
  }
}

export function prepareVoidPrecisionWebRecoveryPlanV1(){
  const source=sourceGeneration();
  inspectCurrentSources(source.source_head_sha);
  requireSourceGenerationStillCurrent(source);
  const material=Object.freeze({
    marker:VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1,
    version:1,
    status:"PRECISION_WEB_RECOVERY_SOURCE_PLAN_READY_HOST_ACCEPTANCE_REQUIRED",
    ...source,
    topology:recoveryProfile(),
    service_profile:serviceProfile(),
    runtime_expectations:Object.freeze({
      adapter_ready_required:true,
      composition_strict_ready_required:true,
      frontdoor_ready_required:true,
      frontdoor_upstream_strict_ready_required:true,
      local_chain:"127.0.0.1:8080 -> 127.0.0.1:8082 -> 127.0.0.1:8083",
      live_node_restart_permitted:false,
      routing_change_permitted:false,
      dns_change_permitted:false,
      funnel_change_permitted:false,
    }),
    recovery_order:Object.freeze([
      "adapter_8080",
      "composition_8082",
      "frontdoor_8083",
      "local_strict_readiness",
      "separate_public_routing_gate",
    ]),
    authority:VOID_PRECISION_WEB_RECOVERY_AUTHORITY_V1,
  });
  const digest=sha256(Buffer.from(canonicalJson(material),"utf8"));
  return Object.freeze({...material,plan_id:"voidpwrp1_"+digest});
}

function verifyCurrentPlanSource(plan){
  exactObject(plan,PLAN_KEYS,"precision_web_plan_shape_invalid");
  if(
    plan.marker!==VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1||
    plan.version!==1||
    plan.status!=="PRECISION_WEB_RECOVERY_SOURCE_PLAN_READY_HOST_ACCEPTANCE_REQUIRED"||
    typeof plan.plan_id!=="string"||
    !PLAN_ID.test(plan.plan_id)
  ) fail("precision_web_plan_identity_invalid");
  const current=prepareVoidPrecisionWebRecoveryPlanV1();
  if(canonicalJson(plan)!==canonicalJson(current)){
    fail("precision_web_plan_not_current");
  }
  return current;
}

function requireUtc(value,code){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)){
    fail(code);
  }
  const ms=Date.parse(value);
  if(!Number.isFinite(ms)||new Date(ms).toISOString()!==value.replace("Z",".000Z")){
    fail(code);
  }
}

function verifyHardening(value){
  exactObject(value,HARDENING_KEYS,"precision_web_hardening_shape_invalid");
  const expected={
    no_new_privileges:true,
    restrict_suid_sgid:true,
    lock_personality:true,
    private_tmp:false,
    protect_home:false,
    protect_system:false,
  };
  if(canonicalJson(value)!==canonicalJson(expected)){
    fail("precision_web_hardening_profile_mismatch");
  }
}

function verifyService(value,expected,code){
  exactObject(value,SERVICE_EVIDENCE_KEYS,code+"_shape");
  if(
    value.active!==true||
    value.listener!==expected.listener||
    value.marker!==expected.marker||
    value.source_file_sha256!==expected.source_file_sha256
  ) fail(code+"_mismatch");
}

export function verifyVoidPrecisionWebRecoveryEvidenceV1({plan,evidence}={}){
  const current=verifyCurrentPlanSource(plan);
  exactObject(evidence,EVIDENCE_KEYS,"precision_web_evidence_shape_invalid");
  if(
    evidence.marker!==VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1||
    evidence.version!==1||
    evidence.status!=="PRECISION_WEB_RECOVERY_LOCALLY_VERIFIED_ROUTING_UNCHANGED"||
    evidence.plan_id!==current.plan_id||
    evidence.source_head_sha!==current.source_head_sha||
    evidence.source_tree_sha!==current.source_tree_sha||
    evidence.host_role!=="precision_public_origin"
  ) fail("precision_web_evidence_identity_invalid");

  const hashes=current.source_file_sha256;
  verifyService(
    evidence.adapter,
    {
      listener:current.topology.adapter.listener,
      marker:current.topology.adapter.marker,
      source_file_sha256:hashes[current.topology.adapter.source],
    },
    "precision_web_adapter_evidence",
  );

  exactObject(
    evidence.composition,
    COMPOSITION_EVIDENCE_KEYS,
    "precision_web_composition_evidence_shape_invalid",
  );
  if(
    evidence.composition.active!==true||
    evidence.composition.listener!==current.topology.composition.listener||
    evidence.composition.marker!==current.topology.composition.marker||
    evidence.composition.runtime_truth_marker!==
      current.topology.composition.runtime_truth_marker||
    evidence.composition.strict_ready!==true||
    evidence.composition.network_name!==current.topology.composition.network_name||
    evidence.composition.node_label!==current.topology.composition.node_label||
    evidence.composition.source_file_sha256!==
      hashes[current.topology.composition.source]
  ) fail("precision_web_composition_evidence_mismatch");

  exactObject(
    evidence.frontdoor,
    FRONTDOOR_EVIDENCE_KEYS,
    "precision_web_frontdoor_evidence_shape_invalid",
  );
  if(
    evidence.frontdoor.active!==true||
    evidence.frontdoor.listener!==current.topology.frontdoor.listener||
    evidence.frontdoor.marker!==current.topology.frontdoor.marker||
    evidence.frontdoor.ready!==true||
    evidence.frontdoor.upstream_strict_ready!==true||
    evidence.frontdoor.upstream_marker!==current.topology.composition.marker||
    evidence.frontdoor.upstream_runtime_truth_marker!==
      current.topology.composition.runtime_truth_marker||
    evidence.frontdoor.source_file_sha256!==
      hashes[current.topology.frontdoor.source]
  ) fail("precision_web_frontdoor_evidence_mismatch");

  exactObject(
    evidence.service_hardening,
    ["adapter","composition","frontdoor"],
    "precision_web_service_hardening_shape_invalid",
  );
  verifyHardening(evidence.service_hardening.adapter);
  verifyHardening(evidence.service_hardening.composition);
  verifyHardening(evidence.service_hardening.frontdoor);

  for(const key of [
    "node_service_restart_performed",
    "tailscale_routing_mutated",
    "dns_mutated",
    "funnel_mutated",
    "wallet_or_signer_accessed",
    "transaction_performed",
    "funds_moved",
  ]){
    if(evidence[key]!==false) fail("precision_web_forbidden_action_observed:"+key);
  }
  requireUtc(evidence.observed_at_utc,"precision_web_observed_at_invalid");

  const body=Object.fromEntries(
    Object.entries(evidence).filter(([key])=>key!=="evidence_id"),
  );
  const digest=sha256(Buffer.from(canonicalJson(body),"utf8"));
  if(
    typeof evidence.evidence_id!=="string"||
    !EVIDENCE_ID.test(evidence.evidence_id)||
    evidence.evidence_id!=="voidpwre1_"+digest
  ) fail("precision_web_evidence_content_id_mismatch");

  return Object.freeze({
    ok:true,
    status:"PRECISION_WEB_RECOVERY_OBSERVATION_CONTRACT_VERIFIED_ACCEPTANCE_REQUIRED",
    plan_id:current.plan_id,
    evidence_id:evidence.evidence_id,
    observation_claims_consistent:true,
    adapter_8080_claim_bound:true,
    composition_8082_strict_ready_claim_bound:true,
    frontdoor_8083_strict_ready_claim_bound:true,
    precision_descriptor_walk_compatible_unit_profile_bound:true,
    routing_unchanged_claim_bound:true,
    live_host_observation_performed_by_this_verifier:false,
    independent_host_acceptance_required:true,
    node_restart_performed:false,
    installation_authorized:false,
    independent_acceptance:false,
    authority:VOID_PRECISION_WEB_RECOVERY_AUTHORITY_V1,
  });
}
