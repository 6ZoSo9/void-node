#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V2 =
  "VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V2";

export const VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_AUTHORITY_V2 =
  Object.freeze({
    host_observation_read_only:true,
    designated_host_only:true,
    filesystem_read:true,
    filesystem_write:true,
    private_temporary_filesystem_write:true,
    repository_source_write:false,
    persistent_host_mutation:false,
    exact_v2_collector_blob_required:true,
    exact_v2_policy_blob_required:true,
    caller_supplied_evidence:false,
    two_live_observations_required:true,
    same_boot_required:true,
    increasing_boottime_generation_required:true,
    stable_host_projection_required:true,
    socket_parent_namespace_v2_required:true,
    source_policy_v2_qualification_required:true,
    live_service_source_identity_required:true,
    live_service_source_identity_proven:false,
    same_live_custody_session_binding_required:true,
    same_live_custody_session_binding_proven:false,
    independent_custody_proven:false,
    custody_production_gate_ready:false,
    service_action:false,
    operator_private_key_access:false,
    production_signing:false,
    authorization_consumption:false,
    attempt_claim:false,
    training_execution:false,
    candidate_weight_mutation:false,
    generation_execution:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
    network_access:false,
    persistent_receipt_write:false,
  });

const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(HERE,"..");
const COLLECTOR_REL=
  "ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py";
const POLICY_V1_REL="tools/apollyon-custody-host-policy-qualification-v1.mjs";
const POLICY_V2_REL="tools/apollyon-custody-host-policy-qualification-v2.mjs";
const COLLECTOR_BLOB_SHA1="25c553567172c1372a29f5e81bc45422022d7f4f";
const POLICY_V1_BLOB_SHA1="6f34e79d94c502e31ca4923fd78922d4875550a5";
const POLICY_BLOB_SHA1="83afde66ad89c29ec7b40932b2ebd7e0b2ce7bc7";
const REVIEWED_EXECUTION_FILES=Object.freeze({
  [COLLECTOR_REL]:COLLECTOR_BLOB_SHA1,
  [POLICY_V1_REL]:POLICY_V1_BLOB_SHA1,
  [POLICY_V2_REL]:POLICY_BLOB_SHA1,
  "tools/apollyon-authorization-custody-core-v1.mjs":
    "f9f18db5bbfeea466202ef0d7babe08c3c401d66",
  "tools/apollyon-authorization-custody-service-v1.mjs":
    "8961572ba5834371b1229f790a1960940fc74935",
  "tools/apollyon-authorization-custody-client-v1.mjs":
    "fb31dbbda76c94f0ad08e38094c151a24a78b486",
});
const MAX_STDOUT_BYTES=128*1024;
const MAX_STDERR_BYTES=32*1024;
const MAX_COLLECTOR_MS=20_000;
const SAFE_NAME=/^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/u;
const SAFE_UNIT=/^[A-Za-z0-9_.@-]+\.service$/u;

function fail(code){throw new Error(code);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`,"ascii"))
    .update(bytes)
    .digest("hex");
}
function sameIdentity(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mode===b.mode&&
    a.uid===b.uid&&a.gid===b.gid&&a.nlink===b.nlink;
}
function readReviewedSource(sourceRoot,relative,expected,code){
  const pathname=resolve(sourceRoot,relative);
  const before=fs.lstatSync(pathname);
  if(
    before.isSymbolicLink()||!before.isFile()||before.nlink!==1||
    before.size<1||before.size>2*1024*1024
  )fail(code);
  const fd=fs.openSync(
    pathname,
    fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK,
  );
  try{
    const opened=fs.fstatSync(fd);
    if(!sameIdentity(before,opened))fail(code);
    const bytes=fs.readFileSync(fd);
    const afterFd=fs.fstatSync(fd);
    const afterPath=fs.lstatSync(pathname);
    if(
      !sameIdentity(opened,afterFd)||!sameIdentity(before,afterPath)||
      bytes.length!==before.size||gitBlobSha1(bytes)!==expected
    )fail(code);
    return bytes;
  }finally{
    fs.closeSync(fd);
  }
}
function ensurePrivateDirectory(pathname){
  if(!fs.existsSync(pathname))fs.mkdirSync(pathname,{mode:0o700});
  fs.chmodSync(pathname,0o700);
  const st=fs.lstatSync(pathname);
  if(
    st.isSymbolicLink()||!st.isDirectory()||st.nlink<1||
    st.uid!==process.geteuid?.()||(st.mode&0o777)!==0o700
  )fail("apollyon_live_qualification_v2_private_tree_directory_invalid");
}
function writePrivateReviewedFile(root,relative,bytes,expected){
  const parts=relative.split("/");
  let parent=root;
  for(const part of parts.slice(0,-1)){
    parent=path.join(parent,part);
    ensurePrivateDirectory(parent);
  }
  const target=path.join(root,...parts);
  fs.writeFileSync(target,bytes,{flag:"wx",mode:0o400});
  fs.chmodSync(target,0o400);
  const verified=readReviewedSource(
    root,relative,expected,
    "apollyon_live_qualification_v2_private_tree_blob_mismatch",
  );
  verified.fill(0);
  return target;
}
export function prepareApollyonReviewedExecutionTreeV2(sourceRoot=ROOT){
  const canonicalRoot=resolve(sourceRoot);
  if(
    typeof sourceRoot!=="string"||canonicalRoot!==sourceRoot||
    sourceRoot.includes("\0")
  )fail("apollyon_live_qualification_v2_source_root_invalid");
  const sourceBytes=new Map();
  for(const [relative,expected] of Object.entries(REVIEWED_EXECUTION_FILES)){
    sourceBytes.set(
      relative,
      readReviewedSource(
        canonicalRoot,relative,expected,
        "apollyon_live_qualification_v2_reviewed_source_blob_mismatch:"+relative,
      ),
    );
  }
  let privateRoot=null;
  try{
    privateRoot=fs.mkdtempSync(
      path.join(os.tmpdir(),"void-apollyon-custody-v2-reviewed-"),
    );
    fs.chmodSync(privateRoot,0o700);
    ensurePrivateDirectory(privateRoot);
    const paths={};
    for(const [relative,expected] of Object.entries(REVIEWED_EXECUTION_FILES)){
      const bytes=sourceBytes.get(relative);
      paths[relative]=writePrivateReviewedFile(
        privateRoot,relative,bytes,expected,
      );
    }
    return Object.freeze({
      root:privateRoot,
      collector:paths[COLLECTOR_REL],
      policy_v2:paths[POLICY_V2_REL],
    });
  }catch(error){
    if(privateRoot)fs.rmSync(privateRoot,{recursive:true,force:true});
    throw error;
  }finally{
    for(const bytes of sourceBytes.values())bytes.fill(0);
  }
}
export async function loadApollyonReviewedPolicyV2(prepared){
  const module=await import(
    pathToFileURL(prepared.policy_v2).href+"?reviewed="+POLICY_BLOB_SHA1
  );
  if(typeof module.qualifyApollyonCustodyHostPolicyV2!=="function"){
    fail("apollyon_live_qualification_v2_reviewed_policy_export_missing");
  }
  return module.qualifyApollyonCustodyHostPolicyV2;
}
export function cleanupApollyonReviewedExecutionTreeV2(prepared){
  if(prepared?.root)fs.rmSync(prepared.root,{recursive:true,force:true});
}
function sortJson(value){
  if(Array.isArray(value))return value.map(sortJson);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=sortJson(value[key]);
    return out;
  }
  return value;
}
function canonical(value){return JSON.stringify(sortJson(value));}
function exactAbs(value,code){
  if(typeof value!=="string"||!path.isAbsolute(value)||path.resolve(value)!==value||value.includes("\0"))fail(code);
  return value;
}
function safeName(value,code){
  if(typeof value!=="string"||!SAFE_NAME.test(value))fail(code);
  return value;
}
function safeUnit(value){
  if(typeof value!=="string"||!SAFE_UNIT.test(value))fail("apollyon_live_qualification_v2_service_unit_invalid");
  return value;
}
function collectorArgs(config,collectorSpecifier){
  return [
    "-I","-B",collectorSpecifier,
    "--training-user",safeName(config.training_user,"apollyon_live_qualification_v2_training_user_invalid"),
    "--custody-user",safeName(config.custody_user,"apollyon_live_qualification_v2_custody_user_invalid"),
    "--ipc-group",safeName(config.ipc_group,"apollyon_live_qualification_v2_ipc_group_invalid"),
    "--state-root",exactAbs(config.state_root,"apollyon_live_qualification_v2_state_root_invalid"),
    "--socket-path",exactAbs(config.socket_path,"apollyon_live_qualification_v2_socket_path_invalid"),
    "--service-unit",safeUnit(config.service_unit),
    "--ttl-ms","300000",
  ];
}
function spawnReviewedCollector(prepared,args){
  const fd=fs.openSync(
    prepared.collector,
    fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK,
  );
  try{
    const st=fs.fstatSync(fd);
    if(
      !st.isFile()||st.isSymbolicLink?.()||st.nlink!==1||
      st.uid!==process.geteuid?.()||(st.mode&0o777)!==0o400
    )fail("apollyon_live_qualification_v2_private_collector_invalid");
    return spawnSync("/usr/bin/python3",["-I","-B","/proc/self/fd/3",...args],{
      encoding:"utf8",
      env:{PATH:"/usr/sbin:/usr/bin:/sbin:/bin",LC_ALL:"C",PYTHONDONTWRITEBYTECODE:"1"},
      timeout:MAX_COLLECTOR_MS,
      maxBuffer:MAX_STDOUT_BYTES+MAX_STDERR_BYTES,
      windowsHide:true,
      stdio:["ignore","pipe","pipe",fd],
    });
  }finally{
    fs.closeSync(fd);
  }
}
export function runApollyonReviewedCollectorSelfTestV2(prepared){
  return spawnReviewedCollector(prepared,["--self-test"]);
}
function runCollector(config,prepared){
  const result=spawnReviewedCollector(
    prepared,
    collectorArgs(config,"/proc/self/fd/3").slice(3),
  );
  if(result.error)fail("apollyon_live_qualification_v2_collector_execution_failed");
  if(result.signal!==null)fail("apollyon_live_qualification_v2_collector_signaled");
  if(result.status!==0){
    const match=String(result.stderr??"").match(/^HOLD=([a-z0-9_]+)$/mu);
    fail("apollyon_live_qualification_v2_collector_held:"+(match?.[1]??"unknown"));
  }
  const stdout=String(result.stdout??"");
  const stderr=String(result.stderr??"");
  if(
    Buffer.byteLength(stdout,"utf8")>MAX_STDOUT_BYTES||
    Buffer.byteLength(stderr,"utf8")>MAX_STDERR_BYTES
  )fail("apollyon_live_qualification_v2_collector_output_oversize");
  if(!stdout.endsWith("\n")||stdout.slice(0,-1).includes("\n")){
    fail("apollyon_live_qualification_v2_collector_stdout_framing_invalid");
  }
  let evidence;
  try{evidence=JSON.parse(stdout.slice(0,-1));}
  catch{fail("apollyon_live_qualification_v2_collector_json_invalid");}
  if(canonical(evidence)+"\n"!==stdout)fail("apollyon_live_qualification_v2_collector_noncanonical");
  if(!stderr.includes("live_host_evidence_collected=true")){
    fail("apollyon_live_qualification_v2_collector_success_marker_missing");
  }
  return evidence;
}
function stableProjection(evidence){
  const copy=JSON.parse(JSON.stringify(evidence));
  delete copy.verification_now_ms;
  delete copy.evidence_snapshot;
  return copy;
}
export function qualifyApollyonDesignatedHostCustodyLivePairV2(
  first,second,qualifyPolicy,
){
  if(typeof qualifyPolicy!=="function"){
    fail("apollyon_live_qualification_v2_reviewed_policy_required");
  }
  const q1=qualifyPolicy(first);
  const q2=qualifyPolicy(second);
  if(
    q1?.ok!==true||q1.status!=="source_policy_qualified"||
    q2?.ok!==true||q2.status!=="source_policy_qualified"
  )fail("apollyon_live_qualification_v2_source_policy_rejected");
  if(first.target_host!=="Xiphos"||second.target_host!=="Xiphos"){
    fail("apollyon_live_qualification_v2_wrong_host");
  }
  const a=first.evidence_snapshot;
  const b=second.evidence_snapshot;
  if(a.boot_id_sha256!==b.boot_id_sha256)fail("apollyon_live_qualification_v2_boot_changed");
  if(
    !Number.isSafeInteger(a.evidence_generation)||
    !Number.isSafeInteger(b.evidence_generation)||
    b.evidence_generation<=a.evidence_generation
  )fail("apollyon_live_qualification_v2_generation_not_monotonic");
  if(
    second.verification_now_ms<first.verification_now_ms||
    b.observed_at_ms<a.observed_at_ms
  )fail("apollyon_live_qualification_v2_realtime_regressed");
  const p1=canonical(stableProjection(first));
  const p2=canonical(stableProjection(second));
  if(p1!==p2)fail("apollyon_live_qualification_v2_host_state_drift");
  const material={
    marker:VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V2,
    version:2,
    status:"live_host_namespace_custody_v2_qualified_source_identity_unproven",
    target_host:"Xiphos",
    collector_blob_sha1:COLLECTOR_BLOB_SHA1,
    policy_blob_sha1:POLICY_BLOB_SHA1,
    first_source_policy_qualification_id:q1.qualification_id,
    second_source_policy_qualification_id:q2.qualification_id,
    first_historical_v1_qualification_id:q1.historical_v1_qualification_id,
    second_historical_v1_qualification_id:q2.historical_v1_qualification_id,
    boot_id_sha256:b.boot_id_sha256,
    first_evidence_generation:a.evidence_generation,
    second_evidence_generation:b.evidence_generation,
    observed_at_ms:b.observed_at_ms,
    verification_now_ms:second.verification_now_ms,
    host_state_sha256:sha256(Buffer.from(p2,"utf8")),
    verification_clock_authority_proven:true,
    evidence_generation_monotonicity_proven:true,
    live_host_qualification_performed:true,
    socket_parent_namespace_custody_live_qualified:true,
    live_service_source_identity_required:true,
    live_service_source_identity_proven:false,
    same_live_custody_session_binding_required:true,
    same_live_custody_session_binding_proven:false,
    independent_custody_proven:false,
    custody_production_gate_ready:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    generation_execution_performed:false,
    operator_private_key_access_performed:false,
    production_signing_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    funds_movement_performed:false,
    network_access_performed:false,
    persistent_receipt_write_performed:false,
    next_gate:"live_custody_service_source_identity_binding_v2",
  };
  return Object.freeze({
    ...material,
    live_qualification_id:
      "apollyon_custody_live_v2:"+sha256(Buffer.from(canonical(material),"utf8")),
    authority:
      VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_AUTHORITY_V2,
  });
}
function fixture(generation,observed,verification,boot="aa".repeat(32)){
  return {
    consumed_directory:{
      direct:true,mode:"0700",owner_gid:981,owner_uid:994,
      parent_bound_to_state_root:true,symlink:false,
      training_uid_rename_unlink_denied:true,training_uid_write_denied:true,
    },
    evidence_snapshot:{
      boot_id_sha256:boot,evidence_generation:generation,
      expires_at_ms:observed+300000,observed_at_ms:observed,
    },
    identities:{
      custody_gid:981,custody_supplementary_gids:[980],custody_uid:994,
      ipc_gid:980,training_gid:1000,training_supplementary_gids:[980],training_uid:1000,
    },
    marker:"VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2",
    service:{
      ambient_capabilities:[],capability_bounding_set:[],
      custody_uid_only_reviewed_service:true,group_gid:981,lock_personality:true,
      manager:"system",no_new_privileges:true,private_devices:true,private_tmp:true,
      protect_control_groups:true,protect_home:true,protect_kernel_logs:true,
      protect_kernel_modules:true,protect_kernel_tunables:true,protect_system:"strict",
      read_write_targets:["socket_parent","state_root"],
      restrict_address_families:["AF_UNIX"],restrict_realtime:true,restrict_suid_sgid:true,
      runtime_can_control_service:false,supplementary_gids:[980],umask:"0077",user_uid:994,
    },
    socket:{
      custody_uid_connect_allowed:true,mode:"0660",owner_gid:980,owner_uid:994,
      training_uid_connect_allowed:true,type:"AF_UNIX_socket",
    },
    socket_parent:{
      custody_uid_write_allowed:true,direct:true,mode:"0750",owner_gid:980,owner_uid:994,
      retained_ancestor_count:2,retained_ancestors_direct:true,
      retained_ancestors_group_other_writable:false,retained_ancestors_root_owned:true,
      retained_ancestors_symlink_free:true,symlink:false,
      training_uid_rename_unlink_denied:true,training_uid_traverse_allowed:true,
      training_uid_write_denied:true,
    },
    source_binding:{
      custody_client_blob_sha1:"fb31dbbda76c94f0ad08e38094c151a24a78b486",
      custody_core_blob_sha1:"f9f18db5bbfeea466202ef0d7babe08c3c401d66",
      custody_service_blob_sha1:"8961572ba5834371b1229f790a1960940fc74935",
    },
    state_root:{
      direct:true,mode:"0700",owner_gid:981,owner_uid:994,realpath_canonical:true,
      retained_ancestor_count:3,retained_ancestors_direct:true,
      retained_ancestors_group_other_writable:false,retained_ancestors_root_owned:true,
      retained_ancestors_symlink_free:true,symlink:false,
      training_uid_rename_unlink_denied:true,training_uid_write_denied:true,
    },
    target_host:"Xiphos",
    verification_now_ms:verification,
    version:2,
  };
}
async function selfTest(){
  const prepared=prepareApollyonReviewedExecutionTreeV2(ROOT);
  try{
    const qualifyPolicy=await loadApollyonReviewedPolicyV2(prepared);
    const first=fixture(100,100000,100100);
    const second=fixture(200,100200,100300);
    const result=qualifyApollyonDesignatedHostCustodyLivePairV2(
      first,second,qualifyPolicy,
    );
    if(
      result.live_host_qualification_performed!==true||
      result.socket_parent_namespace_custody_live_qualified!==true||
      result.live_service_source_identity_proven!==false||
      result.custody_production_gate_ready!==false||
      result.attempt_claimed!==false
    )fail("apollyon_live_qualification_v2_self_test_positive_failed");
    try{
      qualifyApollyonDesignatedHostCustodyLivePairV2(
        first,fixture(100,100200,100300),qualifyPolicy,
      );
      fail("missing_generation_hold");
    }catch(error){
      if(error.message!=="apollyon_live_qualification_v2_generation_not_monotonic")throw error;
    }
    try{
      qualifyApollyonDesignatedHostCustodyLivePairV2(
        first,fixture(200,100200,100300,"bb".repeat(32)),qualifyPolicy,
      );
      fail("missing_boot_hold");
    }catch(error){
      if(error.message!=="apollyon_live_qualification_v2_boot_changed")throw error;
    }
    const drift=fixture(200,100200,100300);
    drift.socket_parent.retained_ancestors_group_other_writable=true;
    try{
      qualifyApollyonDesignatedHostCustodyLivePairV2(
        first,drift,qualifyPolicy,
      );
      fail("missing_namespace_hold");
    }catch(error){
      if(!String(error.message).includes("socket_parent_invalid"))throw error;
    }
    const collectorTest=runApollyonReviewedCollectorSelfTestV2(prepared);
    if(collectorTest.error||collectorTest.signal!==null||collectorTest.status!==0){
      fail("apollyon_live_qualification_v2_collector_self_test_failed");
    }
    if(!String(collectorTest.stdout||"").includes(
      "VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V2_SELF_TEST=GREEN",
    )){
      fail("apollyon_live_qualification_v2_collector_self_test_marker_missing");
    }
    console.log(
      "VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V2_SELF_TEST=GREEN",
    );
  }finally{
    cleanupApollyonReviewedExecutionTreeV2(prepared);
  }
}
function parseCli(argv){
  const out={};
  for(let i=0;i<argv.length;i+=2){
    const key=argv[i],value=argv[i+1];
    if(value===undefined||!key.startsWith("--")){
      fail("apollyon_live_qualification_v2_arguments_invalid");
    }
    const name=key.slice(2).replaceAll("-","_");
    if(Object.hasOwn(out,name))fail("apollyon_live_qualification_v2_arguments_invalid");
    out[name]=value;
  }
  const expected=[
    "training_user","custody_user","ipc_group",
    "state_root","socket_path","service_unit",
  ];
  if(Object.keys(out).sort().join("\n")!==expected.sort().join("\n")){
    fail("apollyon_live_qualification_v2_arguments_invalid");
  }
  return out;
}
async function main(){
  if(process.argv.length===3&&process.argv[2]==="--self-test"){
    await selfTest();
    return;
  }
  if(process.geteuid?.()!==0)fail("apollyon_live_qualification_v2_root_required");
  const config=parseCli(process.argv.slice(2));
  const prepared=prepareApollyonReviewedExecutionTreeV2(ROOT);
  try{
    const qualifyPolicy=await loadApollyonReviewedPolicyV2(prepared);
    const first=runCollector(config,prepared);
    const second=runCollector(config,prepared);
    process.stdout.write(
      canonical(
        qualifyApollyonDesignatedHostCustodyLivePairV2(
          first,second,qualifyPolicy,
        ),
      )+"\n",
    );
  }finally{
    cleanupApollyonReviewedExecutionTreeV2(prepared);
  }
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  main().catch((error)=>{
    process.stderr.write(`HOLD=${String(error?.message||error)}\n`);
    process.stderr.write(
      "host_observation_read_only=true\n"+
      "filesystem_write=true\n"+
      "private_temporary_filesystem_write=true\n"+
      "repository_source_write=false\n"+
      "persistent_host_mutation=false\n"+
      "service_action=false\n"+
      "attempt_claim=false\ntraining_execution=false\n"+
      "live_service_source_identity_proven=false\n",
    );
    process.exitCode=2;
  });
}
