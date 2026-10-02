#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  EXPECTED_VALIDATORS_V1,
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_CONFIRMATION_V1,
  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1,
  compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";

const ROOT=process.cwd();
const SERVICE="void-economic-epoch2-qbft-validator-v1.service";
const ROLE_HOST=Object.freeze({
  precision:"zoso-Precision-Tower-7810",
  nimo:"Nimo",
  xiphos:"Xiphos",
});
const MAX_JSON=2*1024*1024;
const MAX_RPC_BYTES=1024*1024;

function fail(reason) {
  const error=new Error(reason);
  error.name="VoidEpoch2QbftPrivateRuntimeActivationHoldV1";
  throw error;
}
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function run(command,args,options={}) {
  const result=spawnSync(command,args,{
    cwd:options.cwd||ROOT,
    encoding:"utf8",
    input:options.input,
    stdio:options.stdio||["pipe","pipe","pipe"],
    env:{...process.env,...(options.env||{})},
    timeout:options.timeout_ms||30_000,
    maxBuffer:4*1024*1024,
  });
  if(result.error) fail("command_error:"+command+":"+result.error.message);
  if(!options.allow_failure&&result.status!==0) {
    fail(
      "command_failed:"+command+":"+String(result.status)+":"+
      String(result.stderr||result.stdout||"").trim().slice(0,500),
    );
  }
  return result;
}
function git(args) {
  return run("git",args).stdout.trim();
}
function regularFile(raw,label,maxBytes=MAX_JSON) {
  const file=path.resolve(String(raw));
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) fail(label+"_not_regular");
  if(fs.realpathSync(file)!==file) fail(label+"_not_canonical");
  if(st.size<1||st.size>maxBytes) fail(label+"_size_invalid");
  return file;
}
function readJson(raw,label,maxBytes=MAX_JSON) {
  const file=regularFile(raw,label,maxBytes);
  const bytes=fs.readFileSync(file);
  return {file,bytes,value:JSON.parse(bytes.toString("utf8"))};
}
function canonicalJson(value) {
  if(value===null||typeof value==="string"||typeof value==="boolean") {
    return JSON.stringify(value);
  }
  if(typeof value==="number"&&Number.isFinite(value)) return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(canonicalJson).join(",")+"]";
  if(value&&typeof value==="object") {
    return "{"+Object.keys(value).sort()
      .map((key)=>JSON.stringify(key)+":"+canonicalJson(value[key])).join(",")+"}";
  }
  fail("unsupported_canonical_value");
}
function writeNew(raw,value) {
  const file=path.resolve(raw);
  if(fs.existsSync(file)) fail("output_already_exists");
  const parent=path.dirname(file);
  const st=fs.lstatSync(parent);
  if(st.isSymbolicLink()||!st.isDirectory()||fs.realpathSync(parent)!==parent) {
    fail("output_parent_invalid");
  }
  fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n",{flag:"wx",mode:0o600});
  fs.chmodSync(file,0o600);
  return file;
}
function parseArgs(argv) {
  const out={apply:false,confirmation:"",confirm_plan_id:""};
  for(let i=0;i<argv.length;i+=1) {
    const key=argv[i];
    if(key==="--apply") out.apply=true;
    else if(key==="--confirmation") out.confirmation=String(argv[++i]||"");
    else if(key==="--confirm-plan-id") out.confirm_plan_id=String(argv[++i]||"");
    else if(key==="--plan") out.plan=String(argv[++i]||"");
    else if(key==="--bundle-set") out.bundle_set=String(argv[++i]||"");
    else if(key==="--start-admission") out.start_admission=String(argv[++i]||"");
    else if(key==="--install-precision") out.install_precision=String(argv[++i]||"");
    else if(key==="--install-nimo") out.install_nimo=String(argv[++i]||"");
    else if(key==="--install-xiphos") out.install_xiphos=String(argv[++i]||"");
    else if(key==="--activation-plan") out.activation_plan=String(argv[++i]||"");
    else if(key==="--output") out.output=String(argv[++i]||"");
    else fail("unknown_argument:"+String(key));
  }
  for(const key of [
    "plan","bundle_set","start_admission","install_precision","install_nimo","install_xiphos","output",
  ]) {
    if(!out[key]) fail("missing_argument:"+key);
  }
  if(out.apply&&!out.activation_plan) fail("activation_plan_required_for_apply");
  return out;
}
function bashLiteral(value) {
  return "'"+String(value).replaceAll("'","'\\''")+"'";
}
function safeSshTarget(value,label) {
  const target=String(value||"");
  if(!/^[A-Za-z0-9_.@:-]{1,128}$/u.test(target)) fail(label+"_ssh_target_invalid");
  return target;
}
function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
}

class RemoteLane {
  constructor() {
    this.nimo=safeSshTarget(process.env.VOID_NIMO_SSH_TARGET||"Nimo","nimo");
    this.xiphos=safeSshTarget(process.env.VOID_XIPHOS_SSH_TARGET||"xiphos","xiphos");
    this.controlDir=null;
    this.controlPath=null;
    this.nimoMaster=false;
  }
  openNimo() {
    if(this.nimoMaster) return;
    this.controlDir=fs.mkdtempSync(path.join(os.tmpdir(),"void-e2-qbft-ssh."));
    fs.chmodSync(this.controlDir,0o700);
    this.controlPath=path.join(this.controlDir,"nimo.sock");
    console.error(
      "Nimo activation revalidation requires one interactive SSH authentication prompt; "+
      "the controller does not read or store the credential.",
    );
    const result=run("ssh",[
      "-o","ControlMaster=yes",
      "-o","ControlPersist=180",
      "-o","ControlPath="+this.controlPath,
      "-o","BatchMode=no",
      "-o","NumberOfPasswordPrompts=1",
      "-o","ConnectTimeout=8",
      "-N","-f",this.nimo,
    ],{
      stdio:["inherit","inherit","inherit"],
      timeout_ms:30_000,
      allow_failure:true,
    });
    if(result.status!==0) fail("nimo_control_master_auth_failed");
    this.nimoMaster=true;
  }
  close() {
    if(this.nimoMaster&&this.controlPath) {
      run("ssh",[
        "-o","ControlPath="+this.controlPath,
        "-O","exit",this.nimo,
      ],{allow_failure:true,timeout_ms:5_000});
    }
    if(this.controlDir&&fs.existsSync(this.controlDir)) {
      fs.rmSync(this.controlDir,{recursive:true,force:true});
    }
    this.nimoMaster=false;
  }
  exec(role,script,{allow_failure=false}={}) {
    if(role==="precision") {
      return run("bash",["-s"],{
        input:script,
        allow_failure,
        timeout_ms:60_000,
      });
    }
    const target=role==="nimo"?this.nimo:this.xiphos;
    const payload=Buffer.from(script,"utf8").toString("base64");
    const command="printf %s "+bashLiteral(payload)+" | base64 -d | bash";
    const args=[
      "-o","BatchMode=yes",
      "-o","ConnectTimeout=8",
      "-o","ServerAliveInterval=5",
      "-o","ServerAliveCountMax=2",
    ];
    if(role==="nimo") {
      if(!this.nimoMaster) fail("nimo_control_master_required");
      args.push("-o","ControlPath="+this.controlPath);
    }
    args.push(target,command);
    return run("ssh",args,{allow_failure,timeout_ms:60_000});
  }
}

function compileFreshPlan(args,compiledAtUtc) {
  const planFile=readJson(args.plan,"private_plan");
  const bundleSet=readJson(args.bundle_set,"bundle_set").value;
  const startAdmission=readJson(args.start_admission,"start_admission").value;
  const installReceipts={
    precision:readJson(args.install_precision,"install_precision").value,
    nimo:readJson(args.install_nimo,"install_nimo").value,
    xiphos:readJson(args.install_xiphos,"install_xiphos").value,
  };
  const planFileSha=sha256(planFile.bytes);
  const activationPlan=compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1({
    plan:planFile.value,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSet,
    install_receipts:installReceipts,
    start_admission_receipt:startAdmission,
    compiled_at_utc:compiledAtUtc,
  });
  return {
    plan:planFile.value,
    plan_file_sha256:planFileSha,
    bundle_set:bundleSet,
    start_admission:startAdmission,
    install_receipts:installReceipts,
    activation_plan:activationPlan,
  };
}
function requireRepoDescendants(activationPlan,currentHead) {
  const admissionCheck=run("git",[
    "merge-base","--is-ancestor",
    activationPlan.start_admission_observed_repo_head,
    currentHead,
  ],{allow_failure:true});
  if(admissionCheck.status!==0) fail("start_admission_repo_head_not_ancestor");
  for(const row of activationPlan.install_receipts) {
    const result=run("git",[
      "merge-base","--is-ancestor",row.installed_repo_head,currentHead,
    ],{allow_failure:true});
    if(result.status!==0) fail("install_repo_head_not_ancestor:"+row.role);
  }
}
function hostPreflightScript(plan,activationPlan,role) {
  const host=plan.hosts.find((x)=>x.role===role);
  const install=activationPlan.install_receipts.find((x)=>x.role===role);
  if(!host||!install) fail("host_preflight_binding_missing:"+role);
  const rpcCheck=role==="precision"
    ? 'test -z "$(ss -ltnH \'sport = :18553\' 2>/dev/null)" || hold precision_rpc_port_not_vacant'
    : "true";
  const image=plan.runtime.besu_image;
  return [
    "set -Eeuo pipefail",
    "hold(){ printf 'HOLD:%s\\\\n' \"$1\" >&2; exit 2; }",
    'repo="$HOME/dev/void-node"',
    "runtime="+bashLiteral(install.runtime_root),
    "unit="+bashLiteral(install.unit_install_path),
    "plugin="+bashLiteral("/home/zoso/Downloads/void-epoch2-raw-transaction-domain-plugin-v1.jar"),
    "key="+bashLiteral("/home/zoso/.local/share/void/epoch2-qbft-validator-identity-v1/"+role+"/nodekey"),
    "role="+bashLiteral(role),
    "expected_head="+bashLiteral(install.installed_repo_head),
    "expected_ip="+bashLiteral(host.tailscale_ipv4),
    "expected_genesis="+bashLiteral(install.genesis_sha256),
    "expected_static="+bashLiteral(install.static_nodes_sha256),
    "expected_unit="+bashLiteral(install.systemd_unit_sha256),
    "expected_plugin="+bashLiteral(plan.runtime.plugin_sha256),
    "expected_pub="+bashLiteral(host.besu_public_key),
    "expected_addr="+bashLiteral(host.validator_address),
    "service="+bashLiteral(SERVICE),
    'expected_docker_host="unix:///run/user/$(id -u)/docker.sock"',
    "",
    "test \"$(hostname)\" = "+bashLiteral(ROLE_HOST[role])+" || hold hostname_mismatch",
    'test -d "$repo/.git" || hold repo_missing',
    'test "$(git -C "$repo" branch --show-current)" = main || hold repo_not_main',
    'test -z "$(git -C "$repo" status --porcelain=v1 --untracked-files=all)" || hold repo_dirty',
    'git -C "$repo" merge-base --is-ancestor "$expected_head" HEAD || hold repo_head_not_descendant',
    'cd "$repo"',
    "",
    'test "$(tailscale ip -4 2>/dev/null | sed -n \'1p\')" = "$expected_ip" || hold tailnet_ip_mismatch',
    'test -d "$runtime" && test ! -L "$runtime" || hold runtime_root_invalid',
    'test "$(readlink -f "$runtime")" = "$runtime" || hold runtime_root_not_canonical',
    'test -f "$runtime/genesis.json" && test ! -L "$runtime/genesis.json" || hold genesis_invalid',
    'test -f "$runtime/static-nodes.json" && test ! -L "$runtime/static-nodes.json" || hold static_nodes_invalid',
    'test -d "$runtime/data" && test ! -L "$runtime/data" || hold data_dir_invalid',
    'test -z "$(find "$runtime/data" -mindepth 1 -maxdepth 1 -print -quit)" || hold data_dir_not_empty',
    'test "$(sha256sum "$runtime/genesis.json" | awk \'{print $1}\')" = "$expected_genesis" || hold genesis_hash_mismatch',
    'test "$(sha256sum "$runtime/static-nodes.json" | awk \'{print $1}\')" = "$expected_static" || hold static_hash_mismatch',
    'test -f "$unit" && test ! -L "$unit" || hold unit_invalid',
    'test "$(readlink -f "$unit")" = "$unit" || hold unit_not_canonical',
    'test "$(sha256sum "$unit" | awk \'{print $1}\')" = "$expected_unit" || hold unit_hash_mismatch',
    "grep -Fx 'Restart=no' \"$unit\" >/dev/null || hold restart_no_missing",
    "! grep -Eq '^Restart=(always|on-failure|on-success|on-abnormal|on-abort|on-watchdog)$' \"$unit\" || hold automatic_restart_forbidden",
    "",
    'test -f "$plugin" && test ! -L "$plugin" || hold plugin_invalid',
    'test "$(sha256sum "$plugin" | awk \'{print $1}\')" = "$expected_plugin" || hold plugin_hash_mismatch',
    'test -f "$key" && test ! -L "$key" || hold nodekey_invalid',
    'test "$(readlink -f "$key")" = "$key" || hold nodekey_not_canonical',
    'test "$(stat -c \'%h\' "$key")" = 1 || hold nodekey_link_count_invalid',
    'case "$(stat -c \'%a\' "$key")" in 400|600) ;; *) hold nodekey_mode_invalid ;; esac',
    'test "$(stat -c \'%u\' "$key")" = "$(id -u)" || hold nodekey_owner_invalid',
    "",
    "mapfile -t derived < <(",
    '  node --input-type=module - "$key" <<\'NODE\'',
    'import fs from "node:fs";',
    'import {SigningKey,computeAddress} from "ethers";',
    'const raw=fs.readFileSync(process.argv[2],"utf8").trim().toLowerCase().replace(/^0x/u,"");',
    'if(!/^[0-9a-f]{64}$/u.test(raw)) throw new Error("nodekey_shape_invalid");',
    'const key=new SigningKey("0x"+raw);',
    'console.log(key.publicKey.toLowerCase());',
    'console.log(computeAddress(key.publicKey).toLowerCase());',
    "NODE",
    ")",
    'test "${#derived[@]}" = 2 || hold nodekey_derivation_output_invalid',
    'test "${derived[0]}" = "$expected_pub" || hold nodekey_public_key_mismatch',
    'test "${derived[1]}" = "$expected_addr" || hold nodekey_validator_address_mismatch',
    "",
    'docker_bin="$(readlink -f "$(command -v docker)")"',
    'test -x "$docker_bin" || hold docker_missing',
    'docker_security="$("$docker_bin" info --format \'{{json .SecurityOptions}}\')"',
    'printf \'%s\' "$docker_security" | grep -F \'"name=rootless"\' >/dev/null || hold rootless_docker_required',
    'docker_context="$("$docker_bin" context show)"',
    'docker_host="$("$docker_bin" context inspect "$docker_context" --format \'{{.Endpoints.docker.Host}}\')"',
    'test "$docker_host" = "$expected_docker_host" || hold docker_host_mismatch',
    'test -S "${expected_docker_host#unix://}" || hold docker_socket_missing',
    'test "$(stat -c \'%u\' "${expected_docker_host#unix://}")" = "$(id -u)" || hold docker_socket_owner_mismatch',
    'test "$("$docker_bin" inspect --format=\'{{index .RepoDigests 0}}\' '+bashLiteral(image)+')" = '+bashLiteral(image)+' || hold besu_image_mismatch',
    "",
    'active="$(systemctl --user is-active "$service" 2>&1 || true)"',
    'case "$active" in inactive|unknown) ;; *) hold service_not_clean_inactive ;; esac',
    'enabled="$(systemctl --user is-enabled "$service" 2>&1 || true)"',
    'case "$enabled" in disabled|not-found|static) ;; *) hold service_not_clean_disabled ;; esac',
    'for d in "$HOME/.config/systemd/user"/*.wants "$HOME/.config/systemd/user"/*.requires; do',
    '  test -d "$d" || continue',
    '  test ! -L "$d" || continue',
    '  test ! -e "$d/$service" && test ! -L "$d/$service" || hold service_autostart_link_present',
    "done",
    "",
    'test -z "$(ss -ltnH \'sport = :30313\' 2>/dev/null)" || hold p2p_port_not_vacant',
    rpcCheck,
    "",
    "printf '%s\\\\n' VOID_EPOCH2_QBFT_PRESTART_REVALIDATION_GREEN",
    'printf \'role=%s\\\\n\' "$role"',
    "printf '%s\\\\n' nodekey_public_identity_verified=true",
    "printf '%s\\\\n' nodekey_content_exported=false",
    "printf '%s\\\\n' nodekey_stdout=false",
    "printf '%s\\\\n' service_inactive=true",
    "printf '%s\\\\n' service_disabled=true",
    "printf '%s\\\\n' data_empty=true",
    "printf '%s\\\\n' p2p_port_vacant=true",
    "",
  ].join("\n");
}
function startScript() {
  return [
    "set -Eeuo pipefail",
    "service="+bashLiteral(SERVICE),
    'systemctl --user daemon-reload',
    'systemctl --user start "$service"',
    'for _ in $(seq 1 120); do',
    '  systemctl --user is-active --quiet "$service" && exit 0',
    '  sleep 0.25',
    "done",
    'systemctl --user status --no-pager "$service" >&2 || true',
    "exit 2",
    "",
  ].join("\n");
}
function stopScript() {
  return [
    "set -Eeuo pipefail",
    "service="+bashLiteral(SERVICE),
    'systemctl --user stop "$service" 2>/dev/null || true',
    'for _ in $(seq 1 40); do',
    '  systemctl --user is-active --quiet "$service" || exit 0',
    '  sleep 0.25',
    "done",
    "exit 2",
    "",
  ].join("\n");
}
function activeScript() {
  return "systemctl --user is-active --quiet "+bashLiteral(SERVICE)+"\n";
}
function rpcCall(method,params=[]) {
  const payload=JSON.stringify({jsonrpc:"2.0",id:1,method,params});
  const result=run("curl",[
    "-fsS","--max-time","5",
    "-H","content-type: application/json",
    "--data",payload,
    "http://127.0.0.1:18553/",
  ],{allow_failure:true,timeout_ms:8_000});
  if(result.status!==0) return null;
  if(Buffer.byteLength(result.stdout||"")>MAX_RPC_BYTES) fail("rpc_reply_too_large");
  let parsed;
  try { parsed=JSON.parse(result.stdout); } catch { return null; }
  if(parsed?.jsonrpc!=="2.0"||parsed?.id!==1||Object.hasOwn(parsed,"error")) return null;
  return parsed.result;
}
function rpcReady() {
  return rpcCall("eth_chainId",[])==="0x802";
}
function blockNumber() {
  const value=rpcCall("eth_blockNumber",[]);
  if(typeof value!=="string"||!/^0x[0-9a-f]+$/u.test(value)) return null;
  return BigInt(value);
}
function peerCount() {
  const value=rpcCall("net_peerCount",[]);
  if(typeof value!=="string"||!/^0x[0-9a-f]+$/u.test(value)) return null;
  return Number(BigInt(value));
}
function validators() {
  const value=rpcCall("qbft_getValidatorsByBlockNumber",["latest"]);
  if(!Array.isArray(value)) return null;
  return value.map((x)=>String(x).toLowerCase());
}
function validatorsExact() {
  const value=validators();
  if(!value||value.length!==3) return false;
  return JSON.stringify([...value].sort())===
    JSON.stringify([...EXPECTED_VALIDATORS_V1].sort());
}
function waitUntil(test,attempts,delayMs,label) {
  for(let i=0;i<attempts;i+=1) {
    const value=test();
    if(value!==null&&value!==false&&value!==undefined) return value;
    sleepMs(delayMs);
  }
  fail(label);
}
function assertAllActive(remote) {
  for(const role of ["precision","nimo","xiphos"]) {
    const result=remote.exec(role,activeScript(),{allow_failure:true});
    if(result.status!==0) fail("service_not_active:"+role);
  }
}

const args=parseArgs(process.argv.slice(2));
if(os.hostname()!=="zoso-Precision-Tower-7810") fail("precision_host_required");
if(git(["branch","--show-current"])!=="main") fail("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!=="") {
  fail("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

if(!args.apply) {
  const compiled=compileFreshPlan(args,new Date().toISOString());
  requireRepoDescendants(compiled.activation_plan,currentHead);
  const output=writeNew(args.output,compiled.activation_plan);
  console.log("VOID_PRECISION_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_PLAN_V1_GREEN");
  console.log("activation_plan_id="+compiled.activation_plan.activation_plan_id);
  console.log("plan_id="+compiled.activation_plan.plan_id);
  console.log("bundle_set_id="+compiled.activation_plan.bundle_set_id);
  console.log("start_admission_id="+compiled.activation_plan.start_admission_id);
  console.log("start_admission_valid_until_utc="+
    compiled.activation_plan.start_admission_valid_until_utc);
  console.log("start_order=precision,nimo,xiphos");
  console.log("first_possible_authoritative_block_production_step=2");
  console.log("byzantine_fault_tolerance=0");
  console.log("service_start=false");
  console.log("private_key_access=false");
  console.log("authoritative_chain2050_write=false");
  console.log("output="+output);
  process.exit(0);
}

if(
  args.confirmation!==
    VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_CONFIRMATION_V1
) {
  fail("explicit_confirmation_required");
}
const activationPlanFile=readJson(args.activation_plan,"activation_plan");
const activationPlan=
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(
    activationPlanFile.value,
  );
if(args.confirm_plan_id!==activationPlan.activation_plan_id) {
  fail("confirm_plan_id_mismatch");
}
const nowMs=Date.now();
const admissionEvaluatedMs=
  Date.parse(activationPlan.start_admission_evaluated_at_utc);
const admissionExpiryMs=
  Date.parse(activationPlan.start_admission_valid_until_utc);
if(
  !Number.isFinite(admissionEvaluatedMs)||
  !Number.isFinite(admissionExpiryMs)||
  nowMs<admissionEvaluatedMs||
  nowMs>admissionExpiryMs
) {
  fail("start_admission_expired_before_activation");
}
const compiled=compileFreshPlan(args,activationPlan.compiled_at_utc);
requireRepoDescendants(compiled.activation_plan,currentHead);
if(canonicalJson(activationPlan)!==canonicalJson(compiled.activation_plan)) {
  fail("activation_plan_not_freshly_reproducible");
}

const remote=new RemoteLane();
const started=[];
let success=false;
try {
  remote.openNimo();

  for(const role of ["precision","nimo","xiphos"]) {
    const result=remote.exec(
      role,
      hostPreflightScript(compiled.plan,activationPlan,role),
      {allow_failure:true},
    );
    if(result.status!==0) {
      fail(
        "prestart_revalidation_failed:"+role+":"+
        String(result.stderr||result.stdout||"").trim().slice(0,500),
      );
    }
    if(!String(result.stdout||"").includes("VOID_EPOCH2_QBFT_PRESTART_REVALIDATION_GREEN")) {
      fail("prestart_marker_missing:"+role);
    }
  }

  let result=remote.exec("precision",startScript(),{allow_failure:true});
  if(result.status!==0) fail("precision_start_failed");
  started.push("precision");

  waitUntil(()=>rpcReady()?true:null,120,250,"precision_rpc_not_ready");
  if(!validatorsExact()) fail("precision_validator_set_mismatch");
  const precisionInitial=blockNumber();
  if(precisionInitial!==0n) fail("precision_initial_block_not_zero");
  sleepMs(12_000);
  const precisionOnly=blockNumber();
  if(precisionOnly!==0n) fail("precision_only_block_progressed");

  result=remote.exec("nimo",startScript(),{allow_failure:true});
  if(result.status!==0) fail("nimo_start_failed");
  started.push("nimo");

  const afterNimo=waitUntil(()=>{
    if(!validatorsExact()) return null;
    const block=blockNumber();
    const peers=peerCount();
    if(block!==null&&block>=1n&&peers!==null&&peers>=1) {
      return {block,peers};
    }
    return null;
  },120,500,"two_validator_quorum_not_proven");

  result=remote.exec("xiphos",startScript(),{allow_failure:true});
  if(result.status!==0) fail("xiphos_start_failed");
  started.push("xiphos");

  const afterXiphos=waitUntil(()=>{
    if(!validatorsExact()) return null;
    const block=blockNumber();
    const peers=peerCount();
    if(block!==null&&block>afterNimo.block&&peers!==null&&peers>=2) {
      return {block,peers};
    }
    return null;
  },120,500,"three_validator_progress_not_proven");

  assertAllActive(remote);

  const receipt=buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({
    activation_plan:activationPlan,
    activated_at_utc:new Date().toISOString(),
    observed:{
      validators:validators(),
      precision_only_block_number:precisionOnly.toString(10),
      after_nimo_block_number:afterNimo.block.toString(10),
      after_nimo_peer_count:afterNimo.peers,
      after_xiphos_block_number:afterXiphos.block.toString(10),
      after_xiphos_peer_count:afterXiphos.peers,
      chain_id_hex:"0x802",
      started_roles:[...started],
    },
  });
  const output=writeNew(args.output,receipt);
  success=true;
  console.log("VOID_PRECISION_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1_GREEN");
  console.log("activation_receipt_id="+receipt.activation_receipt_id);
  console.log("activation_plan_id="+receipt.activation_plan_id);
  console.log("validator_count=3");
  console.log("required_quorum=2");
  console.log("byzantine_fault_tolerance=0");
  console.log("two_of_three_quorum_proven=true");
  console.log("all_three_validator_services_active=true");
  console.log("docker_mutation=true");
  console.log("private_key_access=true");
  console.log("private_key_content_exported=false");
  console.log("transaction_construction=false");
  console.log("transaction_signing=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=true");
  console.log("funds_movement=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("output="+output);
} finally {
  if(!success) {
    for(const role of [...started].reverse()) {
      remote.exec(role,stopScript(),{allow_failure:true});
    }
  }
  remote.close();
}
