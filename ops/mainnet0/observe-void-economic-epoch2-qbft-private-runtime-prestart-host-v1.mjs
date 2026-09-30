#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync,spawnSync} from "node:child_process";
import {SigningKey,computeAddress} from "ethers";

import {
  buildVoidEconomicEpoch2QbftHostPrestartReceiptV1,
  validateVoidEconomicEpoch2QbftInstallReceiptV1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-prestart-v1.mjs";

const ROOT=process.cwd();
const ROLE_HOST=Object.freeze({
  precision:"zoso-Precision-Tower-7810",
  nimo:"Nimo",
  xiphos:"Xiphos",
});
const MAX_JSON=2*1024*1024;

function fail(reason) {
  throw new Error(reason);
}
function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function git(args) {
  return execFileSync("git",args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  }).trim();
}
function parseArgs(argv) {
  const out={};
  for(let i=0;i<argv.length;i+=2) {
    const key=argv[i];
    const value=argv[i+1];
    if(!key?.startsWith("--")||value===undefined) fail("invalid_arguments");
    out[key.slice(2)]=value;
  }
  for(const key of ["plan","bundle-set","install-receipt","role","output"]) {
    if(!out[key]) fail("missing_argument:"+key);
  }
  return out;
}
function regularFile(raw,label,maxBytes=MAX_JSON) {
  const file=path.resolve(String(raw));
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) fail(label+"_not_regular");
  if(fs.realpathSync(file)!==file) fail(label+"_not_canonical");
  if(st.size<1||st.size>maxBytes) fail(label+"_size_invalid");
  return file;
}
function canonicalDir(raw,label) {
  const dir=path.resolve(String(raw));
  const st=fs.lstatSync(dir);
  if(st.isSymbolicLink()||!st.isDirectory()) fail(label+"_not_directory");
  if(fs.realpathSync(dir)!==dir) fail(label+"_not_canonical");
  return dir;
}
function readJson(raw,label,maxBytes=MAX_JSON) {
  const file=regularFile(raw,label,maxBytes);
  const bytes=fs.readFileSync(file);
  return {file,bytes,value:JSON.parse(bytes.toString("utf8"))};
}
function commandPath(name) {
  return execFileSync("bash",["-lc","command -v "+name],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  }).trim();
}
function systemctl(args) {
  return spawnSync("systemctl",["--user",...args],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  });
}
function requireInactiveDisabled(service) {
  const active=systemctl(["is-active",service]);
  const activeText=String(active.stdout||active.stderr||"").trim();
  if(!["inactive","unknown"].includes(activeText)) {
    fail("service_state_not_clean_inactive:"+activeText);
  }
  const enabled=systemctl(["is-enabled",service]);
  const enabledText=String(enabled.stdout||enabled.stderr||"").trim();
  if(!["disabled","not-found"].includes(enabledText)) {
    fail("service_enable_state_not_clean:"+enabledText);
  }
}
function requireNoAutostartLinks(unitDir,service) {
  for(const name of fs.readdirSync(unitDir)) {
    if(!name.endsWith(".wants")&&!name.endsWith(".requires")) continue;
    const dir=path.join(unitDir,name);
    const st=fs.lstatSync(dir);
    if(st.isSymbolicLink()||!st.isDirectory()) continue;
    const candidate=path.join(dir,service);
    try {
      fs.lstatSync(candidate);
      fail("service_autostart_link_present:"+name);
    } catch(error) {
      if(error?.code!=="ENOENT") throw error;
    }
  }
}
function portVacant(port) {
  const result=spawnSync("ss",["-ltnH","sport = :"+String(port)],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  });
  if(result.status!==0) fail("ss_failed:"+String(port));
  return String(result.stdout||"").trim()==="";
}
function deriveIdentity(keyPath) {
  const rawText=fs.readFileSync(keyPath,"utf8").trim().toLowerCase();
  const raw=rawText.replace(/^0x/u,"");
  if(!/^[0-9a-f]{64}$/u.test(raw)) fail("nodekey_shape_invalid");
  const key=new SigningKey("0x"+raw);
  const publicKey=key.publicKey.toLowerCase();
  const address=computeAddress(publicKey).toLowerCase();
  return {publicKey,address};
}

const args=parseArgs(process.argv.slice(2));
if(!Object.hasOwn(ROLE_HOST,args.role)) fail("role_invalid");
if(os.hostname()!==ROLE_HOST[args.role]) fail("role_hostname_mismatch");

if(git(["branch","--show-current"])!=="main") fail("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!=="") {
  fail("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const planFile=readJson(args.plan,"private_plan");
const bundleSet=readJson(args["bundle-set"],"bundle_set");
const installReceipt=readJson(args["install-receipt"],"install_receipt");
const planFileSha=crypto.createHash("sha256").update(planFile.bytes).digest("hex");

const runtimeRoot=path.join(
  os.homedir(),
  ".local/share/void/epoch2-qbft-private-runtime-v1",
  args.role,
);
canonicalDir(runtimeRoot,"runtime_root");
const materialization=readJson(
  path.join(runtimeRoot,"prepared-materialization.json"),
  "prepared_materialization",
).value;

const validated=validateVoidEconomicEpoch2QbftInstallReceiptV1({
  plan:planFile.value,
  plan_file_sha256:planFileSha,
  bundle_set_receipt:bundleSet.value,
  role:args.role,
  materialization,
  install_receipt:installReceipt.value,
});
const planHost=validated.binding.plan_host;

for(const ancestor of [
  validated.binding.plan.source_head,
  validated.receipt.installed_repo_head,
]) {
  const result=spawnSync("git",["merge-base","--is-ancestor",ancestor,currentHead],{
    cwd:ROOT,
    stdio:["ignore","ignore","ignore"],
  });
  if(result.status!==0) fail("repo_head_not_descendant:"+ancestor);
}

const tailscaleBin=commandPath("tailscale");
const currentIp=execFileSync(tailscaleBin,["ip","-4"],{
  encoding:"utf8",
  stdio:["ignore","pipe","pipe"],
}).trim().split(/\r?\n/u).filter(Boolean);
if(currentIp.length!==1) fail("tailscale_ipv4_cardinality_invalid");
if(currentIp[0]!==planHost.tailscale_ipv4) fail("tailscale_ipv4_drift");

const unitPath=path.resolve(materialization.unit_install_path);
regularFile(unitPath,"installed_unit",256*1024);
const unitStat=fs.lstatSync(unitPath);
if((unitStat.mode&0o777)!==0o600) fail("installed_unit_mode_invalid");
if(sha256File(unitPath)!==validated.receipt.installed_hashes.systemd_unit_sha256) {
  fail("installed_unit_sha256_mismatch");
}

const genesisPath=path.join(runtimeRoot,"genesis.json");
const genesisEvidencePath=path.join(runtimeRoot,"genesis-evidence.json");
const installedBundleSetPath=path.join(runtimeRoot,"bundle-set.json");
const staticPath=path.join(runtimeRoot,"static-nodes.json");
regularFile(genesisPath,"installed_genesis",8*1024*1024);
regularFile(genesisEvidencePath,"installed_genesis_evidence",1024*1024);
regularFile(installedBundleSetPath,"installed_bundle_set",2*1024*1024);
regularFile(staticPath,"installed_static_nodes",64*1024);
if(sha256File(genesisPath)!==validated.receipt.installed_hashes.genesis_sha256) {
  fail("installed_genesis_sha256_mismatch");
}
const installedGenesisEvidence=JSON.parse(
  fs.readFileSync(genesisEvidencePath,"utf8"),
);
if(
  installedGenesisEvidence?.marker!=="VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1"||
  installedGenesisEvidence?.status!==
    "BESU_PRODUCTION_GENESIS_CANDIDATE_BUILT_VALIDATOR_RUNTIME_HOLD"||
  installedGenesisEvidence?.genesis_file_sha256!==
    validated.receipt.installed_hashes.genesis_sha256||
  installedGenesisEvidence?.gates?.production_qbft_extra_data_bound_into_genesis!==true||
  installedGenesisEvidence?.gates?.production_validator_set_bound!==false||
  installedGenesisEvidence?.gates?.migration_authorized!==false||
  installedGenesisEvidence?.gates?.public_activation_authorized!==false
) {
  fail("installed_genesis_evidence_mismatch");
}
if(!fs.readFileSync(installedBundleSetPath).equals(bundleSet.bytes)) {
  fail("installed_bundle_set_bytes_mismatch");
}
if(sha256File(staticPath)!==validated.receipt.installed_hashes.static_nodes_sha256) {
  fail("installed_static_nodes_sha256_mismatch");
}
const peers=JSON.parse(fs.readFileSync(staticPath,"utf8"));
if(JSON.stringify(peers)!==JSON.stringify(planHost.peer_enodes)) {
  fail("installed_static_peer_set_mismatch");
}

const dataDir=canonicalDir(path.join(runtimeRoot,"data"),"installed_data");
if(fs.readdirSync(dataDir).length!==0) fail("installed_data_not_empty");

const unitDir=canonicalDir(path.dirname(unitPath),"systemd_user_dir");
requireNoAutostartLinks(unitDir,materialization.service_name);
requireInactiveDisabled(materialization.service_name);

const pluginPath=path.resolve(materialization.files.plugin.path);
regularFile(pluginPath,"plugin",64*1024*1024);
if(sha256File(pluginPath)!==validated.binding.plan.runtime.plugin_sha256) {
  fail("plugin_sha256_mismatch");
}

const dockerBin=path.resolve(materialization.docker_bin);
regularFile(dockerBin,"docker_bin",32*1024*1024);
const dockerSecurity=JSON.parse(execFileSync(
  dockerBin,
  ["info","--format={{json .SecurityOptions}}"],
  {encoding:"utf8",stdio:["ignore","pipe","pipe"]},
).trim());
if(
  !Array.isArray(dockerSecurity)||
  !dockerSecurity.some((x)=>String(x).includes("rootless"))
) {
  fail("rootless_docker_required");
}
const expectedDockerHost=
  "unix:///run/user/"+String(process.getuid())+"/docker.sock";
const dockerContext=execFileSync(
  dockerBin,
  ["context","show"],
  {encoding:"utf8",stdio:["ignore","pipe","pipe"]},
).trim();
const dockerHost=execFileSync(
  dockerBin,
  ["context","inspect",dockerContext,"--format={{.Endpoints.docker.Host}}"],
  {encoding:"utf8",stdio:["ignore","pipe","pipe"]},
).trim();
if(dockerHost!==expectedDockerHost) fail("rootless_docker_socket_drift");

const image=execFileSync(
  dockerBin,
  ["inspect","--format={{index .RepoDigests 0}}",validated.binding.plan.runtime.besu_image],
  {encoding:"utf8",stdio:["ignore","pipe","pipe"]},
).trim();
if(image!==validated.binding.plan.runtime.besu_image) {
  fail("besu_image_identity_mismatch");
}

if(!portVacant(validated.binding.plan.runtime.p2p_port)) {
  fail("p2p_port_not_vacant");
}
if(
  args.role==="precision"&&
  !portVacant(validated.binding.plan.runtime.precision_loopback_rpc_port)
) {
  fail("precision_rpc_port_not_vacant");
}

const keyPath=path.resolve(materialization.files.nodekey.path);
regularFile(keyPath,"nodekey",4096);
const keyStat=fs.lstatSync(keyPath);
if(fs.realpathSync(keyPath)!==keyPath) fail("nodekey_path_not_canonical");
if(keyStat.nlink!==1) fail("nodekey_link_count_invalid");
const keyMode=(keyStat.mode&0o777).toString(8);
if(!["400","600"].includes(keyMode)) fail("nodekey_mode_invalid");
if(keyStat.uid!==process.getuid()) fail("nodekey_owner_invalid");

const derived=deriveIdentity(keyPath);
if(derived.publicKey!==planHost.besu_public_key) {
  fail("nodekey_public_key_mismatch");
}
if(derived.address!==planHost.validator_address) {
  fail("nodekey_validator_address_mismatch");
}

const expectedEnode=
  "enode://"+
  derived.publicKey.replace(/^0x04/u,"")+
  "@"+currentIp[0]+":"+String(validated.binding.plan.runtime.p2p_port);
if(expectedEnode!==planHost.enode) fail("current_enode_mismatch");

const now=new Date();
const validUntil=new Date(now.getTime()+5*60*1000);
const facts={
  repo_main_clean:true,
  installed_repo_head_ancestor:true,
  current_tailnet_ipv4_exact:true,
  current_enode_exact:true,
  installed_genesis_sha256_exact:true,
  installed_genesis_evidence_bound:true,
  installed_bundle_set_bytes_exact:true,
  installed_static_nodes_sha256_exact:true,
  installed_systemd_unit_sha256_exact:true,
  installed_data_directory_empty:true,
  service_inactive:true,
  service_disabled:true,
  autostart_links_absent:true,
  plugin_sha256_exact:true,
  besu_image_identity_exact:true,
  rootless_docker_verified:true,
  p2p_port_vacant:true,
  precision_rpc_port_vacant:args.role==="precision"?true:null,
  nodekey_regular_private_mode:true,
  nodekey_path_canonical:true,
  nodekey_single_link:true,
  nodekey_public_key_exact:true,
  nodekey_validator_address_exact:true,
  nodekey_bytes_emitted:false,
  nodekey_bytes_persisted:false,
};

const receipt=buildVoidEconomicEpoch2QbftHostPrestartReceiptV1({
  plan:planFile.value,
  plan_file_sha256:planFileSha,
  bundle_set_receipt:bundleSet.value,
  role:args.role,
  materialization,
  install_receipt:installReceipt.value,
  observed_repo_head:currentHead,
  observed_at_utc:now.toISOString(),
  valid_until_utc:validUntil.toISOString(),
  facts,
});

const output=path.resolve(args.output);
if(fs.existsSync(output)) fail("output_already_exists");
const parent=canonicalDir(path.dirname(output),"output_parent");
if(path.dirname(output)!==parent) fail("output_parent_mismatch");
fs.writeFileSync(output,JSON.stringify(receipt,null,2)+"\n",{
  flag:"wx",
  mode:0o600,
});
fs.chmodSync(output,0o600);

console.log("VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PRESTART_HOST_V1");
console.log("role="+args.role);
console.log("prestart_receipt_id="+receipt.prestart_receipt_id);
console.log("plan_id="+receipt.plan_id);
console.log("bundle_set_id="+receipt.bundle_set_id);
console.log("install_receipt_id="+receipt.install_receipt_id);
console.log("observed_at_utc="+receipt.observed_at_utc);
console.log("valid_until_utc="+receipt.valid_until_utc);
console.log("nodekey_content_read_for_identity_revalidation=true");
console.log("nodekey_bytes_emitted=false");
console.log("nodekey_bytes_persisted=false");
console.log("service_action=false");
console.log("systemd_reload=false");
console.log("service_enable=false");
console.log("service_start=false");
console.log("docker_mutation=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
console.log("start_authorized=false");
console.log("output="+output);
console.log("VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PRESTART_HOST_V1_GREEN");
