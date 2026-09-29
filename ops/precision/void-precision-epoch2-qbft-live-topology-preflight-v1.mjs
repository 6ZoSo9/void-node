#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  BESU_IMAGE_V1,
  PLUGIN_SHA256_V1,
  buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1,
} from "../../tools/void-economic-epoch2-qbft-live-topology-preflight-v1.mjs";

const ROOT=process.cwd();
const OUTPUT=process.argv[2];
if(!OUTPUT) {
  console.error("usage: node ops/precision/void-precision-epoch2-qbft-live-topology-preflight-v1.mjs OUTPUT_JSON");
  process.exit(2);
}
if(os.hostname()!=="zoso-Precision-Tower-7810") {
  throw new Error("precision_host_required");
}
if(fs.existsSync(OUTPUT)) throw new Error("output_already_exists");

function run(command,args,options={}) {
  const result=spawnSync(command,args,{
    cwd:ROOT,
    encoding:"utf8",
    input:options.input,
    env:{...process.env,...(options.env||{})},
    maxBuffer:1024*1024,
  });
  if(result.status!==0) {
    throw new Error(
      "command_failed:"+command+":"+String(result.status)+":"+
      String(result.stderr||result.stdout||"").trim().slice(0,500),
    );
  }
  return String(result.stdout||"");
}
function runInteractiveCapture(command,args) {
  const result=spawnSync(command,args,{
    cwd:ROOT,
    encoding:"utf8",
    env:{...process.env},
    maxBuffer:1024*1024,
    stdio:["inherit","pipe","inherit"],
  });
  if(result.status!==0) {
    throw new Error("command_failed:"+command+":"+String(result.status));
  }
  return String(result.stdout||"");
}
function git(args) {
  return run("git",args).trim();
}
if(git(["branch","--show-current"])!=="main") throw new Error("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!=="") {
  throw new Error("clean_worktree_required");
}
const expectedHead=git(["rev-parse","HEAD"]);
if(!/^[0-9a-f]{40}$/u.test(expectedHead)) throw new Error("repo_head_invalid");

function sshTarget(value,label) {
  const target=String(value||"").trim();
  if(!/^[A-Za-z0-9_.@:-]{1,128}$/u.test(target)) {
    throw new Error(label+"_ssh_target_invalid");
  }
  return target;
}
const NIMO=sshTarget(process.env.VOID_NIMO_SSH_TARGET||"Nimo","nimo");
const XIPHOS=sshTarget(process.env.VOID_XIPHOS_SSH_TARGET||"xiphos","xiphos");

function observationScript(role) {
  return `set -u
role="${role}"
repo="$HOME/dev/void-node"
key="$HOME/.local/share/void/epoch2-qbft-validator-identity-v1/${role}/nodekey"
plugin="$HOME/Downloads/void-epoch2-raw-transaction-domain-plugin-v1.jar"
besu="${BESU_IMAGE_V1}"

bool(){ if "$@" >/dev/null 2>&1; then printf true; else printf false; fi; }
printf 'role=%s\\n' "$role"
printf 'hostname=%s\\n' "$(hostname)"
printf 'user=%s\\n' "$(id -un)"
if command -v tailscale >/dev/null 2>&1; then
  ip="$(tailscale ip -4 2>/dev/null | sed -n '1p')"
else
  ip=""
fi
printf 'tailscale_ipv4=%s\\n' "$ip"
if [ -d "$repo/.git" ]; then
  printf 'repo_branch=%s\\n' "$(git -C "$repo" branch --show-current 2>/dev/null || true)"
  printf 'repo_head=%s\\n' "$(git -C "$repo" rev-parse HEAD 2>/dev/null || true)"
  printf 'repo_dirty_count=%s\\n' "$(git -C "$repo" status --porcelain=v1 --untracked-files=all 2>/dev/null | wc -l | tr -d ' ')"
else
  printf 'repo_branch=\\nrepo_head=\\nrepo_dirty_count=-1\\n'
fi
if [ -f "$key" ] && [ ! -L "$key" ]; then
  printf 'nodekey_present=true\\n'
  printf 'nodekey_mode=%s\\n' "$(stat -c '%a' "$key" 2>/dev/null || true)"
else
  printf 'nodekey_present=false\\nnodekey_mode=\\n'
fi
printf 'nodekey_content_read=false\\n'
if [ -f "$plugin" ] && [ ! -L "$plugin" ]; then
  printf 'plugin_present=true\\n'
  printf 'plugin_sha256=%s\\n' "$(sha256sum "$plugin" | awk '{print $1}')"
else
  printf 'plugin_present=false\\nplugin_sha256=\\n'
fi
printf 'docker_reachable=%s\\n' "$(bool docker version)"
printf 'besu_image_present=%s\\n' "$(bool docker image inspect "$besu")"
if command -v ss >/dev/null 2>&1; then
  if [ -z "$(ss -ltnH 'sport = :30313' 2>/dev/null)" ]; then p2p=true; else p2p=false; fi
  if [ -z "$(ss -ltnH 'sport = :18553' 2>/dev/null)" ]; then rpc=true; else rpc=false; fi
else
  p2p=false
  rpc=false
fi
printf 'p2p_port_vacant=%s\\n' "$p2p"
printf 'rpc_port_vacant=%s\\n' "$rpc"
printf 'private_key_bytes_emitted=false\\n'
printf 'service_action=false\\n'
printf 'docker_mutation=false\\n'
`;
}

const KEYS=new Set([
  "role","hostname","user","tailscale_ipv4","repo_branch","repo_head",
  "repo_dirty_count","nodekey_present","nodekey_mode","nodekey_content_read",
  "plugin_present","plugin_sha256","docker_reachable","besu_image_present",
  "p2p_port_vacant","rpc_port_vacant","private_key_bytes_emitted",
  "service_action","docker_mutation",
]);

function parse(text,expectedRole) {
  const raw={};
  for(const line of text.trim().split(/\r?\n/u)) {
    const at=line.indexOf("=");
    if(at<1) throw new Error(expectedRole+":observation_line_invalid");
    const key=line.slice(0,at);
    const value=line.slice(at+1);
    if(!KEYS.has(key)||Object.hasOwn(raw,key)) {
      throw new Error(expectedRole+":observation_key_invalid:"+key);
    }
    raw[key]=value;
  }
  for(const key of KEYS) {
    if(!Object.hasOwn(raw,key)) throw new Error(expectedRole+":observation_key_missing:"+key);
  }
  if(raw.role!==expectedRole) throw new Error(expectedRole+":role_mismatch");
  for(const key of [
    "nodekey_present","nodekey_content_read","plugin_present","docker_reachable",
    "besu_image_present","p2p_port_vacant","rpc_port_vacant",
    "private_key_bytes_emitted","service_action","docker_mutation",
  ]) {
    if(raw[key]!=="true"&&raw[key]!=="false") {
      throw new Error(expectedRole+":boolean_invalid:"+key);
    }
  }
  if(raw.nodekey_content_read!=="false"||
     raw.private_key_bytes_emitted!=="false"||
     raw.service_action!=="false"||
     raw.docker_mutation!=="false") {
    throw new Error(expectedRole+":authority_boundary_violated");
  }
  return {
    role:raw.role,
    hostname:raw.hostname,
    user:raw.user,
    tailscale_ipv4:raw.tailscale_ipv4,
    repo_branch:raw.repo_branch,
    repo_head:raw.repo_head,
    repo_dirty_count:Number(raw.repo_dirty_count),
    nodekey_present:raw.nodekey_present==="true",
    nodekey_mode:raw.nodekey_mode,
    nodekey_content_read:false,
    plugin_present:raw.plugin_present==="true",
    plugin_sha256:raw.plugin_sha256,
    docker_reachable:raw.docker_reachable==="true",
    besu_image_present:raw.besu_image_present==="true",
    p2p_port_vacant:raw.p2p_port_vacant==="true",
    rpc_port_vacant:raw.rpc_port_vacant==="true",
  };
}

function observeLocal(role) {
  return parse(run("bash",["-s"],{input:observationScript(role)}),role);
}
function observeRemote(target,role,{interactiveAuth=false}={}) {
  const payload=Buffer.from(observationScript(role),"utf8").toString("base64");
  const remoteCommand="printf '%s' '"+payload+"' | base64 -d | bash";
  const sshArgs=[
    "-o",interactiveAuth?"BatchMode=no":"BatchMode=yes",
    "-o","ConnectTimeout=8",
    "-o","ServerAliveInterval=5",
    "-o","ServerAliveCountMax=2",
  ];
  if(interactiveAuth) {
    sshArgs.push("-o","NumberOfPasswordPrompts=1");
    console.error(
      "Nimo SSH requires one interactive authentication prompt; "+
      "the preflight does not read or store the credential.",
    );
  }
  sshArgs.push(target,remoteCommand);
  const stdout=interactiveAuth
    ?runInteractiveCapture("ssh",sshArgs)
    :run("ssh",sshArgs);
  return parse(stdout,role);
}

const observations=[
  observeLocal("precision"),
  observeRemote(NIMO,"nimo",{interactiveAuth:true}),
  observeRemote(XIPHOS,"xiphos"),
];

const preflight=buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1({
  expected_head:expectedHead,
  observations,
});
const packet={
  ...preflight,
  observed_at_utc:new Date().toISOString(),
  observed_by_host:os.hostname(),
  ssh_targets:{
    nimo:NIMO,
    xiphos:XIPHOS,
    addresses_persisted_in_repository:false,
  },
  evidence_file_write_performed:true,
  expected_plugin_sha256:PLUGIN_SHA256_V1,
  expected_besu_image:BESU_IMAGE_V1,
};

fs.mkdirSync(path.dirname(path.resolve(OUTPUT)),{recursive:true,mode:0o700});
fs.writeFileSync(OUTPUT,JSON.stringify(packet,null,2)+"\n",{mode:0o600});
fs.chmodSync(OUTPUT,0o600);

console.log("VOID_PRECISION_EPOCH2_QBFT_LIVE_TOPOLOGY_PREFLIGHT_V1");
console.log("topology_preflight_id="+preflight.topology_preflight_id);
console.log("expected_head="+expectedHead);
for(const row of preflight.observations) {
  console.log(
    row.role+
    ":host="+row.hostname+
    ":tailscale_ipv4="+String(row.tailscale_ipv4)+
    ":enode="+String(row.enode),
  );
}
console.log("ready_for_private_successor_runtime_plan="+
  String(preflight.ready_for_private_successor_runtime_plan));
console.log("hold_reasons="+JSON.stringify(preflight.hold_reasons));
console.log("nodekey_content_read=false");
console.log("private_key_bytes_emitted=false");
console.log("service_action=false");
console.log("docker_mutation=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
console.log("output="+path.resolve(OUTPUT));
if(!preflight.ready_for_private_successor_runtime_plan) process.exitCode=2;
