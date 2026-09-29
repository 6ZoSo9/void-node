#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync,spawnSync} from "node:child_process";

import {
  EXPECTED_GENESIS_SHA256_V1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-plan-v1.mjs";
import {
  renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1,
  validateGeneratedMaterializationHashesV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs";

const ROOT=process.cwd();
const planArg=process.argv[2];
const role=process.argv[3];
const outputArg=process.argv[4];

if(!planArg||!role||!outputArg) {
  console.error(
    "usage: node ops/mainnet0/prepare-void-economic-epoch2-qbft-private-runtime-host-v1.mjs PLAN_JSON ROLE OUTPUT_DIR",
  );
  process.exit(2);
}

const ROLE_HOST=Object.freeze({
  precision:"zoso-Precision-Tower-7810",
  nimo:"Nimo",
  xiphos:"Xiphos",
});
if(!Object.hasOwn(ROLE_HOST,role)) throw new Error("role_invalid");
if(os.hostname()!==ROLE_HOST[role]) throw new Error("role_hostname_mismatch");

function git(args) {
  return execFileSync("git",args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  }).trim();
}
function regularFile(raw,label) {
  const resolved=path.resolve(String(raw));
  const st=fs.lstatSync(resolved);
  if(st.isSymbolicLink()||!st.isFile()) throw new Error(label+"_not_regular");
  if(fs.realpathSync(resolved)!==resolved) throw new Error(label+"_not_canonical");
  return resolved;
}
function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function commandPath(name) {
  return execFileSync("bash",["-lc","command -v "+name],{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  }).trim();
}
function portVacant(port) {
  const result=spawnSync("ss",["-ltnH","sport = :"+String(port)],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  });
  if(result.status!==0) throw new Error("ss_failed:"+String(port));
  return String(result.stdout||"").trim()==="";
}

if(git(["branch","--show-current"])!=="main") throw new Error("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!=="") {
  throw new Error("clean_worktree_required");
}

const planPath=regularFile(planArg,"private_plan");
const plan=validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(
  JSON.parse(fs.readFileSync(planPath,"utf8")),
);
const currentHead=git(["rev-parse","HEAD"]);
execFileSync(
  "git",
  ["merge-base","--is-ancestor",plan.source_head,currentHead],
  {cwd:ROOT,stdio:["ignore","ignore","ignore"]},
);

const output=path.resolve(outputArg);
if(fs.existsSync(output)) throw new Error("output_already_exists");

const dockerBin=commandPath("docker");
const dockerStat=fs.lstatSync(dockerBin);
if(
  !path.isAbsolute(dockerBin)||
  dockerStat.isSymbolicLink()||
  !dockerStat.isFile()||
  (dockerStat.mode & 0o111)===0||
  fs.realpathSync(dockerBin)!==dockerBin
) {
  throw new Error("docker_path_untrusted");
}
const ssBin=commandPath("ss");
if(ssBin!=="/usr/bin/ss"&&ssBin!=="/bin/ss") throw new Error("ss_path_unexpected");

const host=plan.hosts.find((x)=>x.role===role);
if(!host) throw new Error("role_missing_from_plan");

const keyPath=path.join(
  os.homedir(),
  ".local/share/void/epoch2-qbft-validator-identity-v1",
  role,
  "nodekey",
);
const keyStat=fs.lstatSync(keyPath);
if(keyStat.isSymbolicLink()||!keyStat.isFile()) throw new Error("nodekey_not_regular");
const keyMode=(keyStat.mode & 0o777).toString(8);
if(keyMode!=="400"&&keyMode!=="600") throw new Error("nodekey_mode_invalid");
if(keyStat.uid!==process.getuid()) throw new Error("nodekey_owner_invalid");

const pluginPath=path.join(
  os.homedir(),
  "Downloads/void-epoch2-raw-transaction-domain-plugin-v1.jar",
);
regularFile(pluginPath,"plugin");
if(sha256File(pluginPath)!==plan.runtime.plugin_sha256) {
  throw new Error("plugin_sha256_mismatch");
}

const image=execFileSync(
  dockerBin,
  ["inspect","--format={{index .RepoDigests 0}}",plan.runtime.besu_image],
  {encoding:"utf8",stdio:["ignore","pipe","pipe"]},
).trim();
if(image!==plan.runtime.besu_image) throw new Error("besu_image_identity_mismatch");

if(!portVacant(plan.runtime.p2p_port)) throw new Error("p2p_port_not_vacant");
if(role==="precision"&&!portVacant(plan.runtime.precision_loopback_rpc_port)) {
  throw new Error("precision_rpc_port_not_vacant");
}

const outputParent=path.dirname(output);
const outputParentStat=fs.lstatSync(outputParent);
if(
  outputParentStat.isSymbolicLink()||
  !outputParentStat.isDirectory()||
  fs.realpathSync(outputParent)!==outputParent
) {
  throw new Error("output_parent_invalid");
}
const stage=fs.mkdtempSync(
  path.join(outputParent,"."+path.basename(output)+".tmp."),
);
fs.chmodSync(stage,0o700);
let published=false;

try {
const genesisPath=path.join(stage,"genesis.json");
const genesisEvidencePath=path.join(stage,"genesis-evidence.json");

execFileSync(
  process.execPath,
  [
    "tools/void-economic-epoch2-besu-genesis-builder-v1.mjs",
    "--state-manifest",
    "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
    "--qbft-production-extra-data",
    "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json",
    "--out-genesis",genesisPath,
    "--out-evidence",genesisEvidencePath,
    "--apply",
    "--confirmation","buildEpoch2BesuGenesisCandidate",
  ],
  {cwd:ROOT,stdio:["ignore","pipe","pipe"]},
);
if(sha256File(genesisPath)!==EXPECTED_GENESIS_SHA256_V1) {
  throw new Error("genesis_sha256_mismatch");
}

const rendered=renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1({
  plan,
  role,
  home:os.homedir(),
  docker_bin:dockerBin,
  uid:process.getuid(),
  gid:process.getgid(),
});
validateGeneratedMaterializationHashesV1(rendered);

const staticPath=path.join(stage,"static-nodes.json");
const unitPath=path.join(stage,"void-economic-epoch2-qbft-validator-v1.service");
const manifestPath=path.join(stage,"materialization.json");
fs.writeFileSync(staticPath,rendered.static_nodes_json,{flag:"wx",mode:0o600});
fs.writeFileSync(unitPath,rendered.systemd_unit,{flag:"wx",mode:0o600});

const preparation={
  ...rendered.manifest,
  status:"HOST_RUNTIME_PREPARED_INSTALL_AND_START_HOLD",
  prepared_at_utc:new Date().toISOString(),
  prepared_on_host:os.hostname(),
  prepared_repo_head:currentHead,
  private_plan_file_sha256:sha256File(planPath),
  local_checks:{
    repo_main_clean:true,
    plan_source_head_ancestor:true,
    nodekey_regular_private_mode:true,
    nodekey_content_read:false,
    plugin_sha256_exact:true,
    besu_image_identity_exact:true,
    p2p_port_vacant:true,
    precision_rpc_port_vacant:
      role==="precision"?true:null,
    genesis_sha256_exact:true,
    static_nodes_sha256_exact:
      sha256File(staticPath)===rendered.manifest.files.static_nodes.sha256,
    rendered_unit_sha256_exact:
      sha256File(unitPath)===rendered.manifest.rendered_unit_sha256,
  },
  preparation_authority:{
    local_output_directory_write:true,
    target_runtime_root_write:false,
    service_unit_installation:false,
    systemd_reload:false,
    service_enable:false,
    service_start:false,
    docker_inspection:true,
    docker_mutation:false,
    nodekey_metadata_read:true,
    nodekey_content_read:false,
    private_key_access:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
  },
};
fs.writeFileSync(
  manifestPath,
  JSON.stringify(preparation,null,2)+"\n",
  {flag:"wx",mode:0o600},
);

const genesisSha=sha256File(genesisPath);
const staticSha=sha256File(staticPath);
const unitSha=sha256File(unitPath);

fs.renameSync(stage,output);
published=true;

console.log("VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_HOST_PREPARE_V1");
console.log("role="+role);
console.log("plan_id="+plan.plan_id);
console.log("materialization_id="+rendered.manifest.materialization_id);
console.log("genesis_sha256="+genesisSha);
console.log("static_nodes_sha256="+staticSha);
console.log("systemd_unit_sha256="+unitSha);
console.log("atomic_bundle_publish=true");
console.log("partial_bundle_retained_on_failure=false");
console.log("nodekey_content_read=false");
console.log("target_runtime_root_write=false");
console.log("service_unit_installation=false");
console.log("systemd_reload=false");
console.log("service_start=false");
console.log("docker_mutation=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
console.log("output="+output);
console.log("VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_HOST_PREPARE_V1_GREEN");
} finally {
  if(!published&&fs.existsSync(stage)) {
    fs.rmSync(stage,{recursive:true,force:true});
  }
}
