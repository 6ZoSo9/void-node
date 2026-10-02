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
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_REATTEST_CONFIRMATION_V1,
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
  const out={apply:false,reattest_existing:false,confirmation:""};
  for(let i=0;i<argv.length;i+=1) {
    const key=argv[i];
    if(key==="--apply") out.apply=true;
    else if(key==="--reattest-existing") out.reattest_existing=true;
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
  if(out.apply&&out.reattest_existing) {
    fail("install_apply_and_reattest_mutually_exclusive");
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
function requireInactiveUnitFileState(service,{allowStatic=false}={}) {
  const active=systemctl(["is-active",service]);
  const activeText=String(active.stdout||active.stderr||"").trim();
  if(!["inactive","unknown"].includes(activeText)) {
    fail("service_state_not_clean_inactive:"+activeText);
  }
  const enabled=systemctl(["is-enabled",service]);
  const unitFileState=String(enabled.stdout||enabled.stderr||"").trim();
  const accepted=allowStatic
    ? ["disabled","not-found","static"]
    : ["disabled","not-found"];
  if(!accepted.includes(unitFileState)) {
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
function requireOwnedMode(file,expectedMode,label) {
  const st=fs.lstatSync(file);
  if(
    st.isSymbolicLink()||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o777)!==expectedMode
  ) {
    fail(label+"_identity_invalid");
  }
  return st;
}
function requireNoInstallSection(bytes,code) {
  if(/^[ \t]*\[Install\][ \t]*$/mu.test(bytes.toString("utf8"))) {
    fail(code);
  }
}
function stableOwnedFileBytes(file,expectedMode,label,maxBytes=MAX_JSON) {
  const resolved=regularFile(file,label,maxBytes);
  const pathBefore=fs.lstatSync(resolved);
  const fd=fs.openSync(
    resolved,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try {
    const before=fs.fstatSync(fd);
    if(
      !before.isFile()||
      before.nlink!==1||
      (typeof process.getuid==="function"&&before.uid!==process.getuid())||
      (before.mode&0o777)!==expectedMode||
      before.size<1||
      before.size>maxBytes
    ) {
      fail(label+"_descriptor_identity_invalid");
    }
    const bytes=Buffer.alloc(before.size);
    let offset=0;
    while(offset<bytes.length) {
      const count=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);
      if(count<=0) fail(label+"_short_read");
      offset+=count;
    }
    const after=fs.fstatSync(fd);
    for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]) {
      if(before[key]!==after[key]) fail(label+"_changed_during_read");
    }
    const pathAfter=fs.lstatSync(resolved);
    if(
      pathAfter.isSymbolicLink()||
      pathAfter.dev!==before.dev||
      pathAfter.ino!==before.ino||
      pathBefore.dev!==before.dev||
      pathBefore.ino!==before.ino
    ) {
      fail(label+"_path_identity_changed");
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}
function requireExactBytes(file,expected,label,maxBytes=MAX_JSON) {
  const actual=stableOwnedFileBytes(file,0o600,label,maxBytes);
  if(!actual.equals(expected)) fail(label+"_bytes_mismatch");
}
function verifyExistingInstalledRuntime({
  runtimeRoot,
  unitPath,
  bundle,
  bundleSetRaw,
  hashes,
}) {
  canonicalDir(runtimeRoot,"existing_runtime_root");
  requireOwnedMode(runtimeRoot,0o700,"existing_runtime_root");

  const expectedEntries=[
    "bundle-set.json",
    "data",
    "genesis-evidence.json",
    "genesis.json",
    "prepared-materialization.json",
    "static-nodes.json",
  ];
  const actualEntries=fs.readdirSync(runtimeRoot).sort();
  if(JSON.stringify(actualEntries)!==JSON.stringify(expectedEntries)) {
    fail("existing_runtime_membership_mismatch");
  }

  const genesis=path.join(runtimeRoot,"genesis.json");
  const genesisEvidence=path.join(runtimeRoot,"genesis-evidence.json");
  const staticNodes=path.join(runtimeRoot,"static-nodes.json");
  const prepared=path.join(runtimeRoot,"prepared-materialization.json");
  const bundleSet=path.join(runtimeRoot,"bundle-set.json");
  const data=path.join(runtimeRoot,"data");

  for(const [file,label] of [
    [genesis,"existing_genesis"],
    [genesisEvidence,"existing_genesis_evidence"],
    [staticNodes,"existing_static_nodes"],
    [prepared,"existing_materialization"],
    [bundleSet,"existing_bundle_set"],
  ]) {
    regularFile(file,label,MAX_JSON);
    requireOwnedMode(file,0o600,label);
  }
  canonicalDir(data,"existing_data");
  requireOwnedMode(data,0o700,"existing_data");
  if(fs.readdirSync(data).length!==0) fail("existing_data_not_empty");

  const genesisBytes=
    stableOwnedFileBytes(genesis,0o600,"existing_genesis");
  const staticNodesBytes=
    stableOwnedFileBytes(staticNodes,0o600,"existing_static_nodes");
  if(
    sha256(genesisBytes)!==hashes.genesisSha||
    sha256(staticNodesBytes)!==hashes.staticSha
  ) {
    fail("existing_runtime_hash_mismatch");
  }
  requireExactBytes(
    genesisEvidence,
    Buffer.from(JSON.stringify(bundle.genesis_evidence,null,2)+"\n"),
    "existing_genesis_evidence",
  );
  requireExactBytes(
    prepared,
    Buffer.from(JSON.stringify(bundle.materialization,null,2)+"\n"),
    "existing_materialization",
  );
  requireExactBytes(bundleSet,bundleSetRaw,"existing_bundle_set");

  const unitBytes=
    stableOwnedFileBytes(unitPath,0o600,"existing_unit",256*1024);
  if(sha256(unitBytes)!==hashes.unitSha) fail("existing_unit_hash_mismatch");
  requireNoInstallSection(unitBytes,"existing_unit_install_section_forbidden");

  return Object.freeze({
    runtime_root_exact:true,
    unit_exact:true,
    data_empty:true,
  });
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
  requireNoInstallSection(
    bundle.systemd_unit_raw,
    "bundle_unit_install_section_forbidden",
  );
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
const preState=requireInactiveUnitFileState(
  binding.manifest.service_name,
  {allowStatic:args.reattest_existing},
);

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
console.log("pre_operator_user_unit_dir_direct_enablement_links_absent=true");
console.log("pre_indirect_activation_absence_proven=false");
console.log("daemon_reload=false");
console.log("service_enable=false");
console.log("service_start=false");
console.log("docker_mutation=false");
console.log("nodekey_content_read=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
console.log("apply="+String(args.apply));
console.log("reattest_existing="+String(args.reattest_existing));

if(args.reattest_existing) {
  if(
    args.confirmation!==
      VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_REATTEST_CONFIRMATION_V1
  ) {
    fail("reattest_explicit_confirmation_required");
  }
  if(preState.unit_file_state!=="static") {
    fail("reattest_unit_file_state_not_static:"+preState.unit_file_state);
  }
  verifyExistingInstalledRuntime({
    runtimeRoot,
    unitPath,
    bundle,
    bundleSetRaw:bundleSetFile.raw,
    hashes,
  });
  requireNoDirectEnablementLinks(unitDir,binding.manifest.service_name);
  const postState=requireInactiveUnitFileState(
    binding.manifest.service_name,
    {allowStatic:true},
  );
  if(postState.unit_file_state!=="static") {
    fail("reattest_unit_file_state_changed:"+postState.unit_file_state);
  }
  verifyExistingInstalledRuntime({
    runtimeRoot,
    unitPath,
    bundle,
    bundleSetRaw:bundleSetFile.raw,
    hashes,
  });
  const receipt=buildVoidEconomicEpoch2QbftHostInstallReceiptV1({
    plan:planFile.value,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSetFile.value,
    role:args.role,
    materialization:bundle.materialization,
    receipt_basis:"existing_runtime_read_only_reattestation",
    observed_at_utc:new Date().toISOString(),
    observed_repo_head:currentHead,
    unit_file_state:postState.unit_file_state,
    operator_user_unit_dir_direct_enablement_links_absent:true,
  });
  writeNew(
    output,
    Buffer.from(JSON.stringify(receipt,null,2)+"\n"),
    0o600,
  );
  console.log("receipt_basis=existing_runtime_read_only_reattestation");
  console.log("runtime_filesystem_mutation=false");
  console.log("unit_filesystem_mutation=false");
  console.log("daemon_reload=false");
  console.log("service_enable=false");
  console.log("service_start=false");
  console.log("docker_mutation=false");
  console.log("nodekey_content_read=false");
  console.log("authoritative_chain2050_write=false");
  console.log("funds_movement=false");
  console.log("install_receipt="+output);
  console.log(VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1+"_REATTEST_GREEN");
  process.exit(0);
}

if(fs.existsSync(runtimeRoot)) fail("runtime_root_already_exists");
if(fs.existsSync(unitPath)) fail("unit_path_already_exists");

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

  const observedAt=new Date().toISOString();

  fs.renameSync(runtimeStage,runtimeRoot);
  runtimePublished=true;
  fs.renameSync(unitStage,unitPath);
  unitPublished=true;

  requireNoDirectEnablementLinks(unitDir,binding.manifest.service_name);
  const postState=requireInactiveUnitFileState(
    binding.manifest.service_name,
    {allowStatic:true},
  );
  if(postState.unit_file_state!=="static") {
    fail("install_post_unit_file_state_not_static:"+postState.unit_file_state);
  }

  verifyExistingInstalledRuntime({
    runtimeRoot,
    unitPath,
    bundle,
    bundleSetRaw:bundleSetFile.raw,
    hashes,
  });

  const receipt=buildVoidEconomicEpoch2QbftHostInstallReceiptV1({
    plan:planFile.value,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSetFile.value,
    role:args.role,
    materialization:bundle.materialization,
    receipt_basis:"fresh_install",
    observed_at_utc:observedAt,
    observed_repo_head:currentHead,
    unit_file_state:postState.unit_file_state,
    operator_user_unit_dir_direct_enablement_links_absent:true,
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
  console.log("post_operator_user_unit_dir_direct_enablement_links_absent=true");
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
