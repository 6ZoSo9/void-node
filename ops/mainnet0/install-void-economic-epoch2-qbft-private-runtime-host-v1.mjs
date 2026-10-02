#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync,spawnSync} from "node:child_process";

import {
  readVoidEconomicEpoch2PreparedBundleV1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-bundle-set-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1,
  buildVoidEconomicEpoch2QbftHostInstallReceiptV1,
  validateVoidEconomicEpoch2QbftHostInstallBindingV1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-install-v1.mjs";

const ROOT=process.cwd();
const ROLE_HOST=Object.freeze({
  precision:"zoso-Precision-Tower-7810",
  nimo:"Nimo",
  xiphos:"Xiphos",
});
const MAX_JSON=2*1024*1024;

function fail(reason) {
  const error=new Error(reason);
  error.name="VoidEpoch2QbftPrivateRuntimeInstallHoldV1";
  throw error;
}
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function git(args) {
  return execFileSync("git",args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  }).trim();
}
function parseArgs(argv) {
  const out={apply:false,confirmation:""};
  for(let i=0;i<argv.length;i+=1) {
    const key=argv[i];
    if(key==="--apply") out.apply=true;
    else if(key==="--confirmation") out.confirmation=String(argv[++i]||"");
    else if(key==="--plan") out.plan=String(argv[++i]||"");
    else if(key==="--bundle") out.bundle=String(argv[++i]||"");
    else if(key==="--bundle-set") out.bundle_set=String(argv[++i]||"");
    else if(key==="--role") out.role=String(argv[++i]||"");
    else if(key==="--output") out.output=String(argv[++i]||"");
    else fail("unknown_argument:"+String(key));
  }
  for(const key of ["plan","bundle","bundle_set","role","output"]) {
    if(!out[key]) fail("missing_argument:"+key);
  }
  return out;
}
function regularFile(raw,label,maxBytes=MAX_JSON) {
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) fail(label+"_not_regular");
  if(fs.realpathSync(file)!==file) fail(label+"_not_canonical");
  if(st.size<1||st.size>maxBytes) fail(label+"_size_invalid");
  return file;
}
function canonicalDir(raw,label) {
  const dir=path.resolve(raw);
  const st=fs.lstatSync(dir);
  if(st.isSymbolicLink()||!st.isDirectory()) fail(label+"_not_directory");
  if(fs.realpathSync(dir)!==dir) fail(label+"_not_canonical");
  return dir;
}
function readJsonFile(raw,label,maxBytes=MAX_JSON) {
  const file=regularFile(raw,label,maxBytes);
  return {
    file,
    raw:fs.readFileSync(file),
    value:JSON.parse(fs.readFileSync(file,"utf8")),
  };
}
function systemctl(args) {
  return spawnSync("systemctl",["--user",...args],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  });
}
function requireInactiveUnitFileState(service) {
  const active=systemctl(["is-active",service]);
  const activeText=String(active.stdout||active.stderr||"").trim();
  if(!["inactive","unknown"].includes(activeText)) {
    fail("service_state_not_clean_inactive:"+activeText);
  }
  const enabled=systemctl(["is-enabled",service]);
  const unitFileState=String(enabled.stdout||enabled.stderr||"").trim();
  if(!["disabled","not-found","static"].includes(unitFileState)) {
    fail("service_unit_file_state_not_clean:"+unitFileState);
  }
  return {active_state:activeText,unit_file_state:unitFileState};
}
function requireNoDirectEnablementLinks(unitDir,service) {
  for(const name of fs.readdirSync(unitDir)) {
    if(!name.endsWith(".wants")&&!name.endsWith(".requires")) continue;
    const dir=path.join(unitDir,name);
    const st=fs.lstatSync(dir);
    if(st.isSymbolicLink()) {
      fail("service_enablement_directory_symlink:"+name);
    }
    if(!st.isDirectory()) {
      fail("service_enablement_directory_not_directory:"+name);
    }
    const candidate=path.join(dir,service);
    try {
      fs.lstatSync(candidate);
      fail("service_direct_enablement_link_present:"+name);
    } catch(error) {
      if(error?.code!=="ENOENT") throw error;
    }
  }
  return true;
}
function writeNew(file,bytes,mode) {
  fs.writeFileSync(file,bytes,{flag:"wx",mode});
  fs.chmodSync(file,mode);
}
function validateBundleBytes(bundle,binding) {
  const genesisSha=sha256(bundle.genesis_raw);
  const staticSha=sha256(bundle.static_nodes_raw);
  const unitSha=sha256(bundle.systemd_unit_raw);
  if(genesisSha!==binding.row.genesis_sha256) fail("bundle_genesis_sha_mismatch");
  if(staticSha!==binding.row.static_nodes_sha256) fail("bundle_static_nodes_sha_mismatch");
  if(unitSha!==binding.row.systemd_unit_sha256) fail("bundle_unit_sha_mismatch");
  if(!bundle.systemd_unit_raw.toString("utf8").includes("\nRestart=no\n")) {
    fail("bundle_unit_restart_policy_mismatch");
  }
  if(bundle.systemd_unit_raw.toString("utf8").includes("\nRestart=on-failure\n")) {
    fail("bundle_unit_auto_restart_forbidden");
  }
  return {genesisSha,staticSha,unitSha};
}

const args=parseArgs(process.argv.slice(2));
if(!Object.hasOwn(ROLE_HOST,args.role)) fail("role_invalid");
if(os.hostname()!==ROLE_HOST[args.role]) fail("role_hostname_mismatch");

if(git(["branch","--show-current"])!=="main") fail("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!=="") {
  fail("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const planFile=readJsonFile(args.plan,"private_plan");
const bundleSetFile=readJsonFile(args.bundle_set,"bundle_set");
const bundleDir=canonicalDir(args.bundle,"bundle");
const bundle=readVoidEconomicEpoch2PreparedBundleV1(bundleDir);
const planFileSha=sha256(planFile.raw);

const binding=validateVoidEconomicEpoch2QbftHostInstallBindingV1({
  plan:planFile.value,
  plan_file_sha256:planFileSha,
  bundle_set_receipt:bundleSetFile.value,
  role:args.role,
  materialization:bundle.materialization,
});
const hashes=validateBundleBytes(bundle,binding);

for(const ancestor of [
  binding.plan.source_head,
  binding.row.prepared_repo_head,
]) {
  const check=spawnSync("git",["merge-base","--is-ancestor",ancestor,currentHead],{
    cwd:ROOT,
    stdio:["ignore","ignore","ignore"],
  });
  if(check.status!==0) fail("repo_head_not_descendant:"+ancestor);
}

const runtimeRoot=path.resolve(binding.manifest.runtime_root);
const expectedRuntimeRoot=path.join(
  os.homedir(),
  ".local/share/void/epoch2-qbft-private-runtime-v1",
  args.role,
);
if(runtimeRoot!==expectedRuntimeRoot) fail("runtime_root_mismatch");

const unitPath=path.resolve(binding.manifest.unit_install_path);
const expectedUnitPath=path.join(
  os.homedir(),
  ".config/systemd/user",
  binding.manifest.service_name,
);
if(unitPath!==expectedUnitPath) fail("unit_install_path_mismatch");

const unitDir=canonicalDir(path.dirname(unitPath),"systemd_user_dir");
requireNoDirectEnablementLinks(unitDir,binding.manifest.service_name);
const preState=requireInactiveUnitFileState(binding.manifest.service_name);

if(fs.existsSync(runtimeRoot)) fail("runtime_root_already_exists");
if(fs.existsSync(unitPath)) fail("unit_path_already_exists");

const output=path.resolve(args.output);
if(fs.existsSync(output)) fail("output_already_exists");
const outputParent=canonicalDir(path.dirname(output),"output_parent");

console.log(VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1);
console.log("role="+args.role);
console.log("plan_id="+binding.plan.plan_id);
console.log("bundle_set_id="+binding.bundle_set_receipt.bundle_set_id);
console.log("materialization_id="+binding.manifest.materialization_id);
console.log("runtime_root="+runtimeRoot);
console.log("unit_install_path="+unitPath);
console.log("pre_active_state="+preState.active_state);
console.log("pre_unit_file_state="+preState.unit_file_state);
console.log("pre_direct_enablement_links_absent=true");
console.log("pre_indirect_activation_absence_proven=false");
console.log("daemon_reload=false");
console.log("service_enable=false");
console.log("service_start=false");
console.log("docker_mutation=false");
console.log("nodekey_content_read=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
console.log("apply="+String(args.apply));

if(!args.apply) {
  console.log("required_confirmation="+
    VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_CONFIRMATION_V1);
  console.log(VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1+"_PLAN_GREEN");
  process.exit(0);
}
if(
  args.confirmation!==
    VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_CONFIRMATION_V1
) {
  fail("explicit_confirmation_required");
}

const voidStateBase=path.join(os.homedir(),".local/share/void");
const voidStateBaseStat=fs.lstatSync(voidStateBase);
if(
  voidStateBaseStat.isSymbolicLink()||
  !voidStateBaseStat.isDirectory()||
  fs.realpathSync(voidStateBase)!==voidStateBase
) {
  fail("void_state_base_invalid");
}
const runtimeParent=path.dirname(runtimeRoot);
if(path.dirname(runtimeParent)!==voidStateBase) {
  fail("runtime_parent_scope_invalid");
}
if(!fs.existsSync(runtimeParent)) {
  fs.mkdirSync(runtimeParent,{mode:0o700});
}
const runtimeParentStat=fs.lstatSync(runtimeParent);
if(
  runtimeParentStat.isSymbolicLink()||
  !runtimeParentStat.isDirectory()||
  fs.realpathSync(runtimeParent)!==runtimeParent
) {
  fail("runtime_parent_invalid");
}
fs.chmodSync(runtimeParent,0o700);

const runtimeStage=fs.mkdtempSync(
  path.join(runtimeParent,"."+args.role+".install.tmp."),
);
fs.chmodSync(runtimeStage,0o700);
const unitStage=path.join(
  unitDir,
  "."+binding.manifest.service_name+".install."+process.pid+"."+Date.now(),
);
const outputStage=path.join(
  outputParent,
  "."+path.basename(output)+".tmp."+process.pid+"."+Date.now(),
);

let runtimePublished=false;
let unitPublished=false;
let outputPublished=false;

try {
  writeNew(path.join(runtimeStage,"genesis.json"),bundle.genesis_raw,0o600);
  writeNew(
    path.join(runtimeStage,"genesis-evidence.json"),
    Buffer.from(JSON.stringify(bundle.genesis_evidence,null,2)+"\n"),
    0o600,
  );
  writeNew(
    path.join(runtimeStage,"static-nodes.json"),
    bundle.static_nodes_raw,
    0o600,
  );
  writeNew(
    path.join(runtimeStage,"prepared-materialization.json"),
    Buffer.from(JSON.stringify(bundle.materialization,null,2)+"\n"),
    0o600,
  );
  writeNew(
    path.join(runtimeStage,"bundle-set.json"),
    bundleSetFile.raw,
    0o600,
  );
  fs.mkdirSync(path.join(runtimeStage,"data"),{mode:0o700});
  fs.chmodSync(path.join(runtimeStage,"data"),0o700);

  writeNew(unitStage,bundle.systemd_unit_raw,0o600);

  const installedAt=new Date().toISOString();

  fs.renameSync(runtimeStage,runtimeRoot);
  runtimePublished=true;
  fs.renameSync(unitStage,unitPath);
  unitPublished=true;

  requireNoDirectEnablementLinks(unitDir,binding.manifest.service_name);
  const postState=requireInactiveUnitFileState(binding.manifest.service_name);
  if(postState.unit_file_state!=="static") {
    fail("install_post_unit_file_state_not_static:"+postState.unit_file_state);
  }

  if(
    sha256(fs.readFileSync(path.join(runtimeRoot,"genesis.json")))!==hashes.genesisSha||
    sha256(fs.readFileSync(path.join(runtimeRoot,"static-nodes.json")))!==hashes.staticSha||
    sha256(fs.readFileSync(unitPath))!==hashes.unitSha||
    fs.readdirSync(path.join(runtimeRoot,"data")).length!==0
  ) {
    fail("post_install_hash_or_data_check_failed");
  }

  const receipt=buildVoidEconomicEpoch2QbftHostInstallReceiptV1({
    plan:planFile.value,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSetFile.value,
    role:args.role,
    materialization:bundle.materialization,
    installed_at_utc:installedAt,
    installed_repo_head:currentHead,
    unit_file_state:postState.unit_file_state,
    direct_enablement_links_absent:true,
  });
  writeNew(
    outputStage,
    Buffer.from(JSON.stringify(receipt,null,2)+"\n"),
    0o600,
  );
  fs.renameSync(outputStage,output);
  outputPublished=true;

  console.log("post_active_state="+postState.active_state);
  console.log("post_unit_file_state="+postState.unit_file_state);
  console.log("post_direct_enablement_links_absent=true");
  console.log("post_indirect_activation_absence_proven=false");
  console.log("runtime_root_present=true");
  console.log("user_unit_file_present=true");
  console.log("data_directory_empty=true");
  console.log("daemon_reload=false");
  console.log("service_enable=false");
  console.log("service_start=false");
  console.log("docker_mutation=false");
  console.log("nodekey_content_read=false");
  console.log("authoritative_chain2050_write=false");
  console.log("funds_movement=false");
  console.log("install_receipt="+output);
  console.log(VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1+"_GREEN");
} finally {
  if(!outputPublished&&fs.existsSync(outputStage)) {
    fs.rmSync(outputStage,{force:true});
  }
  if(!unitPublished&&fs.existsSync(unitStage)) {
    fs.rmSync(unitStage,{force:true});
  }
  if(!runtimePublished&&fs.existsSync(runtimeStage)) {
    fs.rmSync(runtimeStage,{recursive:true,force:true});
  }
  if(!outputPublished) {
    if(unitPublished&&fs.existsSync(unitPath)) fs.rmSync(unitPath,{force:true});
    if(runtimePublished&&fs.existsSync(runtimeRoot)) {
      fs.rmSync(runtimeRoot,{recursive:true,force:true});
    }
  }
}
