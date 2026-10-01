#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1 =
  "VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1";

export const VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V1 =
  Object.freeze({
    source_only_plan: true,
    canonical_git_source_binding_required: true,
    exact_frontdoor_source_required: true,
    path_preservation_required: true,
    external_cloudflared_sha256_required: true,
    credential_metadata_binding_required: true,
    credential_content_read: false,
    create_only_private_packet_write: true,
    precision_recovery_independent_acceptance_required: true,
    repository_write: false,
    cloudflared_execution: false,
    network_call: false,
    dns_mutation: false,
    tls_mutation: false,
    systemd_install: false,
    systemd_reload: false,
    service_start: false,
    routing_mutation: false,
    tailscale_or_funnel_mutation: false,
    node_restart: false,
    credential_content_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    validator_mutation: false,
    work_credit_mutation: false,
    funds_movement: false,
    installation_authorized: false,
    ingress_activation_authorized: false,
    independent_public_acceptance: false,
  });

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const GIT="/usr/bin/git";
const HOSTNAME="voidchain.org";
const PUBLIC_ORIGIN="https://voidchain.org";
const FRONTDOOR_ORIGIN="http://127.0.0.1:8083";
const FRONTDOOR_STATUS_PATH="/__void/frontdoor/status.json";
const FRONTDOOR_MARKER="VOID_PUBLIC_FRONTDOOR_V1";
const COMPOSITION_MARKER="VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1";
const RUNTIME_TRUTH_MARKER="VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1";
const SCHEMA="void.voidchain-path-preserving-ingress-plan.v1";
const MAX_EXECUTABLE_BYTES=256*1024*1024;
const MAX_PACKET_FILE_BYTES=2*1024*1024;
const HEX40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const PLAN_ID=/^voidvci1_[0-9a-f]{64}$/u;

const SOURCE_BLOBS=Object.freeze({
  "ops/public/void-public-frontdoor-v1.mjs":
    "b1513ea822e32fe5df55c00ab635128b07aaf170",
  "scripts/prove_void_public_frontdoor_v1.mjs":
    "05b04307e8839b0de9aaef3fd0882ec9e298a965",
  "ops/public/void-public-app-composition-gateway-v1.mjs":
    "caaaebb8da9e21cf9ac1c429865c931400cb0526",
  "ops/public/run-void-public-app-composition-gateway-v1.sh":
    "e9b74924304985d87e00972db61f29a607f19124",
  "ops/systemd/user/void-public-app-composition-gateway-v1.service.example":
    "d7add3da6d34bece418084c877cd4be667495ffb",
  "ops/public/public-seed-adapter-v1.mjs":
    "60158fa63c7fafc55738d4b5a021cc021983812a",
  "ops/public/run-public-seed-adapter-v1.sh":
    "bc5f5d8c277c114b007a5676015729ec25fc09dd",
  "tools/void-precision-web-recovery-evidence-v1.mjs":
    "bca7d83c08607644058c4c3fe67f6be766d9fb3f",
  "docs/operators/precision-web-recovery-evidence-v1.md":
    "7cc2a9eac3d6317fb779e8adbd2c62aa1d3bab8f",
  "public/void-public-frontdoor-v1/index.html":
    "19b09b0be6d8b7841855e0e86103f5fb0f56efac",
});

const GIT_OVERRIDE_KEYS=Object.freeze([
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_NAMESPACE",
  "GIT_REPLACE_REF_BASE",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_PARAMETERS",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
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

const PACKET_KEYS=Object.freeze([
  "marker",
  "schema",
  "version",
  "hostname",
  "public_origin",
  "tunnel_id",
  "repository",
  "frontdoor",
  "precision_recovery_prerequisite",
  "credential",
  "cloudflared",
  "generated_files",
  "path_contract",
  "activation",
  "authority",
  "plan_id",
]);

function fail(code){throw new Error(code);}

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function exactObject(value,keys,code){
  if(!plain(value)) fail(code);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null) fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const actual=Reflect.ownKeys(descriptors);
  if(actual.some((key)=>typeof key!=="string")) fail(code);
  const sorted=[...actual].sort();
  const expected=[...keys].sort();
  if(sorted.length!==expected.length||sorted.some((key,i)=>key!==expected[i])){
    fail(code);
  }
  const out=Object.create(null);
  for(const key of keys){
    const descriptor=descriptors[key];
    if(!descriptor||descriptor.enumerable!==true||!Object.hasOwn(descriptor,"value")){
      fail(code);
    }
    out[key]=descriptor.value;
  }
  return Object.freeze(out);
}

function compareText(a,b){return a<b?-1:a>b?1:0;}

function canonicalJson(value){
  if(value===null) return "null";
  if(typeof value==="string") return JSON.stringify(value);
  if(typeof value==="boolean") return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)) return "["+value.map(canonicalJson).join(",")+"]";
  if(plain(value)){
    return "{"+Object.keys(value).sort(compareText).map(
      (key)=>JSON.stringify(key)+":"+canonicalJson(value[key]),
    ).join(",")+"}";
  }
  fail("VOIDCHAIN_INGRESS_CANONICAL_VALUE_INVALID");
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

function rejectControl(value,label){
  const text=String(value);
  if(/[\0\r\n]/u.test(text)) fail(label+"_CONTROL_CHARACTER_FORBIDDEN");
  return text;
}

function yamlDoubleQuoted(value,label){
  return JSON.stringify(rejectControl(value,label));
}

function isInside(parent,candidate){
  const rel=path.relative(parent,candidate);
  return rel===""||(rel!==".."&&!rel.startsWith(".."+path.sep)&&!path.isAbsolute(rel));
}

function safeGitEnv(){
  const env={...process.env};
  for(const key of GIT_OVERRIDE_KEYS) delete env[key];
  for(const key of Object.keys(env)){
    if(/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/u.test(key)) delete env[key];
  }
  return {
    ...env,
    PATH:"/usr/bin:/bin",
    HOME:"/nonexistent",
    XDG_CONFIG_HOME:"/nonexistent",
    LANG:"C",
    LC_ALL:"C",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_TERMINAL_PROMPT:"0",
    GIT_ASKPASS:"/bin/false",
  };
}

function rejectAmbientGitOverrides(){
  for(const key of GIT_OVERRIDE_KEYS){
    if(process.env[key]) fail("VOIDCHAIN_INGRESS_AMBIENT_GIT_OVERRIDE:"+key);
  }
  for(const key of Object.keys(process.env)){
    if(/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/u.test(key)&&process.env[key]){
      fail("VOIDCHAIN_INGRESS_AMBIENT_GIT_OVERRIDE:"+key);
    }
  }
}

function gitRun(args,{encoding="utf8",maxBuffer=32*1024*1024}={}){
  const result=spawnSync(
    GIT,
    ["--no-replace-objects","-C",ROOT,...args],
    {
      encoding,
      stdio:["ignore","pipe","pipe"],
      env:safeGitEnv(),
      maxBuffer,
      timeout:10_000,
    },
  );
  if(result.error||result.status!==0){
    fail("VOIDCHAIN_INGRESS_GIT_FAILED:"+args.join("_"));
  }
  return result.stdout;
}

function gitText(args){
  return String(gitRun(args)).trim();
}

function headBytes(relativePath){
  return Buffer.from(gitRun(
    ["show","HEAD:"+relativePath],
    {encoding:null,maxBuffer:16*1024*1024},
  ));
}

function canonicalOrigin(value){
  const accepted=new Set([
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ]);
  const text=String(value||"").trim();
  if(!accepted.has(text)) fail("VOIDCHAIN_INGRESS_CANONICAL_ORIGIN_REQUIRED");
  return "https://github.com/6ZoSo9/void-node.git";
}

function requireText(source,needle,code){
  if(!source.includes(needle)) fail(code);
}

function validateFrontdoorSourceSemantics(sources){
  const frontdoor=sources["ops/public/void-public-frontdoor-v1.mjs"].toString("utf8");
  const composition=
    sources["ops/public/void-public-app-composition-gateway-v1.mjs"].toString("utf8");
  const recovery=
    sources["docs/operators/precision-web-recovery-evidence-v1.md"].toString("utf8");

  for(const [needle,code] of [
    ['const BIND = process.env.VOID_PUBLIC_FRONTDOOR_BIND || "127.0.0.1";',
      "VOIDCHAIN_INGRESS_FRONTDOOR_BIND_DRIFT"],
    ['const PORT = Number(process.env.VOID_PUBLIC_FRONTDOOR_PORT || "8083");',
      "VOIDCHAIN_INGRESS_FRONTDOOR_PORT_DRIFT"],
    ['const UPSTREAM_HOST = "127.0.0.1";',
      "VOIDCHAIN_INGRESS_FRONTDOOR_UPSTREAM_HOST_DRIFT"],
    ['process.env.VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT || "8082"',
      "VOIDCHAIN_INGRESS_FRONTDOOR_UPSTREAM_PORT_DRIFT"],
    ['path: req.url || "/"',
      "VOIDCHAIN_INGRESS_FRONTDOOR_PATH_PRESERVATION_DRIFT"],
    ['const UPSTREAM_STATUS_PATH = "/__void/public-app/network.json";',
      "VOIDCHAIN_INGRESS_FRONTDOOR_READINESS_PATH_DRIFT"],
    ['const UPSTREAM_MARKER = "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1";',
      "VOIDCHAIN_INGRESS_FRONTDOOR_UPSTREAM_MARKER_DRIFT"],
    ['const UPSTREAM_RUNTIME_TRUTH_MARKER = "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1";',
      "VOIDCHAIN_INGRESS_FRONTDOOR_RUNTIME_MARKER_DRIFT"],
    ['ready: upstreamEvidence?.ready === true',
      "VOIDCHAIN_INGRESS_FRONTDOOR_READY_NOT_UPSTREAM_BOUND"],
    ['if (BIND !== "127.0.0.1")',
      "VOIDCHAIN_INGRESS_FRONTDOOR_LOOPBACK_GUARD_MISSING"],
  ]){
    requireText(frontdoor,needle,code);
  }

  for(const [needle,code] of [
    ["VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1",
      "VOIDCHAIN_INGRESS_COMPOSITION_MARKER_DRIFT"],
    ["VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1",
      "VOIDCHAIN_INGRESS_RUNTIME_TRUTH_MARKER_DRIFT"],
    ["127.0.0.1:4100",
      "VOIDCHAIN_INGRESS_COMPOSITION_NODE_UPSTREAM_DRIFT"],
  ]){
    requireText(composition,needle,code);
  }

  for(const [needle,code] of [
    ["public adapter  127.0.0.1:8080",
      "VOIDCHAIN_INGRESS_RECOVERY_ADAPTER_TOPOLOGY_DRIFT"],
    ["composition     127.0.0.1:8082",
      "VOIDCHAIN_INGRESS_RECOVERY_COMPOSITION_TOPOLOGY_DRIFT"],
    ["frontdoor       127.0.0.1:8083",
      "VOIDCHAIN_INGRESS_RECOVERY_FRONTDOOR_TOPOLOGY_DRIFT"],
    ["independent live-host acceptance",
      "VOIDCHAIN_INGRESS_RECOVERY_ACCEPTANCE_BOUNDARY_DRIFT"],
  ]){
    requireText(recovery,needle,code);
  }
}

function bindRepositorySource(expectedHead){
  rejectAmbientGitOverrides();
  if(typeof expectedHead!=="string"||!HEX40.test(expectedHead)){
    fail("VOIDCHAIN_INGRESS_EXPECTED_HEAD_INVALID");
  }
  if(fs.realpathSync.native(ROOT)!==ROOT){
    fail("VOIDCHAIN_INGRESS_REPOSITORY_ROOT_ALIAS_FORBIDDEN");
  }
  const status=gitText(["status","--porcelain=v1","--untracked-files=all"]);
  if(status!=="") fail("VOIDCHAIN_INGRESS_REPOSITORY_NOT_CLEAN");
  const head=gitText(["rev-parse","HEAD"]);
  const tree=gitText(["rev-parse","HEAD^{tree}"]);
  if(!HEX40.test(head)||!HEX40.test(tree)){
    fail("VOIDCHAIN_INGRESS_REPOSITORY_IDENTITY_INVALID");
  }
  if(head!==expectedHead) fail("VOIDCHAIN_INGRESS_REPOSITORY_HEAD_MISMATCH");
  const remote=canonicalOrigin(
    gitText(["config","--get","remote.origin.url"]),
  );

  const sources=Object.create(null);
  const blobs=Object.create(null);
  const fileSha=Object.create(null);
  for(const [relativePath,expectedBlob] of Object.entries(SOURCE_BLOBS)){
    const blob=gitText(["rev-parse","HEAD:"+relativePath]);
    if(blob!==expectedBlob){
      fail("VOIDCHAIN_INGRESS_REVIEWED_SOURCE_BLOB_DRIFT:"+relativePath);
    }
    const bytes=headBytes(relativePath);
    if(gitBlobSha1(bytes)!==expectedBlob){
      fail("VOIDCHAIN_INGRESS_GIT_OBJECT_BLOB_MISMATCH:"+relativePath);
    }
    sources[relativePath]=bytes;
    blobs[relativePath]=blob;
    fileSha[relativePath]=sha256(bytes);
  }
  validateFrontdoorSourceSemantics(sources);
  return Object.freeze({
    head,
    tree,
    canonical_remote_url:remote,
    source_blobs:Object.freeze({...blobs}),
    source_file_sha256:Object.freeze({...fileSha}),
  });
}

function normalizeTunnelId(value){
  const text=rejectControl(value,"VOIDCHAIN_INGRESS_TUNNEL_ID")
    .trim().toLowerCase();
  if(!UUID.test(text)) fail("VOIDCHAIN_INGRESS_TUNNEL_ID_INVALID");
  return text;
}

function requireAbsoluteCanonicalFile(raw,label){
  const value=rejectControl(raw,label);
  if(!path.isAbsolute(value)||path.resolve(value)!==value){
    fail(label+"_PATH_NOT_CANONICAL_ABSOLUTE");
  }
  let real;
  let stat;
  try{
    real=fs.realpathSync.native(value);
    stat=fs.lstatSync(value,{bigint:true});
  }catch{
    fail(label+"_UNAVAILABLE");
  }
  if(real!==value||stat.isSymbolicLink()||!stat.isFile()){
    fail(label+"_REGULAR_NONSYMLINK_REQUIRED");
  }
  return Object.freeze({path:value,stat});
}

function credentialMetadata(raw,tunnelId){
  const source=requireAbsoluteCanonicalFile(
    raw,
    "VOIDCHAIN_INGRESS_CREDENTIAL",
  );
  if(isInside(ROOT,source.path)){
    fail("VOIDCHAIN_INGRESS_CREDENTIAL_MUST_BE_OUTSIDE_REPOSITORY");
  }
  if(path.basename(source.path)!==tunnelId+".json"){
    fail("VOIDCHAIN_INGRESS_CREDENTIAL_FILENAME_MISMATCH");
  }
  const mode=Number(source.stat.mode&0o777n);
  if(mode!==0o400&&mode!==0o600){
    fail("VOIDCHAIN_INGRESS_CREDENTIAL_MODE_INVALID");
  }
  const uid=typeof process.getuid==="function"?process.getuid():null;
  if(!Number.isSafeInteger(uid)||uid<0){
    fail("VOIDCHAIN_INGRESS_UID_UNAVAILABLE");
  }
  if(source.stat.uid!==BigInt(uid)){
    fail("VOIDCHAIN_INGRESS_CREDENTIAL_OWNER_MISMATCH");
  }
  if(source.stat.size<2n||source.stat.size>2n*1024n*1024n){
    fail("VOIDCHAIN_INGRESS_CREDENTIAL_SIZE_INVALID");
  }
  const material=Object.freeze({
    path:source.path,
    tunnel_id:tunnelId,
    dev:String(source.stat.dev),
    ino:String(source.stat.ino),
    size:String(source.stat.size),
    mode:mode.toString(8).padStart(4,"0"),
    uid:String(source.stat.uid),
    gid:String(source.stat.gid),
    mtime_ns:String(source.stat.mtimeNs),
    ctime_ns:String(source.stat.ctimeNs),
    content_read:false,
  });
  return Object.freeze({
    ...material,
    metadata_id:"voidvcicm1_"+sha256(Buffer.from(canonicalJson(material),"utf8")),
  });
}

function stableFileSha256(raw,expectedSha,label){
  const source=requireAbsoluteCanonicalFile(raw,label);
  if(isInside(ROOT,source.path)){
    fail(label+"_MUST_BE_OUTSIDE_REPOSITORY");
  }
  if(typeof expectedSha!=="string"||!HEX64.test(expectedSha)){
    fail(label+"_EXPECTED_SHA256_INVALID");
  }
  if((source.stat.mode&0o111n)===0n){
    fail(label+"_NOT_EXECUTABLE");
  }
  if(source.stat.size<1n||source.stat.size>BigInt(MAX_EXECUTABLE_BYTES)){
    fail(label+"_SIZE_INVALID");
  }

  const fd=fs.openSync(
    source.path,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const before=fs.fstatSync(fd,{bigint:true});
    const hash=crypto.createHash("sha256");
    const chunk=Buffer.alloc(1024*1024);
    let offset=0n;
    while(offset<before.size){
      const want=Number(
        (before.size-offset)>BigInt(chunk.length)
          ?BigInt(chunk.length)
          :before.size-offset,
      );
      const count=fs.readSync(fd,chunk,0,want,Number(offset));
      if(count<=0) fail(label+"_SHORT_READ");
      hash.update(chunk.subarray(0,count));
      offset+=BigInt(count);
    }
    const after=fs.fstatSync(fd,{bigint:true});
    for(const key of ["dev","ino","size","mtimeNs","ctimeNs"]){
      if(before[key]!==after[key]) fail(label+"_CHANGED_DURING_READ");
    }
    const digest=hash.digest("hex");
    if(digest!==expectedSha) fail(label+"_SHA256_MISMATCH");
    return Object.freeze({
      path:source.path,
      sha256:digest,
      bytes:String(before.size),
      dev:String(before.dev),
      ino:String(before.ino),
      mode:Number(before.mode&0o7777n).toString(8).padStart(4,"0"),
      mtime_ns:String(before.mtimeNs),
      ctime_ns:String(before.ctimeNs),
      executed:false,
    });
  }finally{
    fs.closeSync(fd);
  }
}

function systemdQuote(value){
  const text=rejectControl(value,"VOIDCHAIN_INGRESS_SYSTEMD_ARGUMENT");
  if(text.includes("%")) fail("VOIDCHAIN_INGRESS_SYSTEMD_SPECIFIER_FORBIDDEN");
  return '"'+text.replace(/\\/gu,"\\\\").replace(/"/gu,'\\"')+'"';
}

function renderConfig({tunnelId,credentialPath}){
  return [
    "tunnel: "+tunnelId,
    "credentials-file: "+
      yamlDoubleQuoted(credentialPath,"VOIDCHAIN_INGRESS_CREDENTIAL_YAML"),
    "originRequest:",
    "  connectTimeout: 10s",
    "ingress:",
    "  - hostname: "+HOSTNAME,
    "    service: "+FRONTDOOR_ORIGIN,
    "  - service: http_status:404",
    "",
  ].join("\n");
}

function renderUnit({cloudflaredPath,configPath,tunnelId}){
  return [
    "[Unit]",
    "Description=VOID voidchain.org path-preserving ingress v1",
    "After=network-online.target void-public-frontdoor-v1.service",
    "Wants=network-online.target void-public-frontdoor-v1.service",
    "",
    "[Service]",
    "Type=simple",
    "ExecStart="+
      systemdQuote(cloudflaredPath)+
      " --no-autoupdate --config "+
      systemdQuote(configPath)+
      " tunnel run "+
      systemdQuote(tunnelId),
    "Restart=on-failure",
    "RestartSec=5",
    "KillMode=control-group",
    "TimeoutStopSec=20",
    "NoNewPrivileges=true",
    "PrivateTmp=true",
    "RestrictSUIDSGID=true",
    "LockPersonality=true",
    "",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");
}

function renderInstructions({outputDir,head}){
  return [
    "VOID voidchain.org path-preserving ingress plan v1",
    "",
    "THIS PACKET IS INERT. IT IS NOT INSTALLATION OR ACTIVATION AUTHORITY.",
    "",
    "hostname="+HOSTNAME,
    "public_origin="+PUBLIC_ORIGIN,
    "frontdoor_origin="+FRONTDOOR_ORIGIN,
    "repository_head="+head,
    "packet_dir="+outputDir,
    "",
    "Required before any future install/activation:",
    "- merge/accept current Precision web recovery source and independent live-host observation (#1618);",
    "- independently review this packet and exact cloudflared executable identity;",
    "- create a separate failure-atomic install/rollback plan;",
    "- separately authorize DNS/TLS/tunnel activation;",
    "- externally prove public path preservation and strict frontdoor readiness.",
    "",
    "No command in this packet should be treated as authorization to start services.",
    "",
  ].join("\n");
}

function normalizeOutputDir(raw){
  const output=path.resolve(rejectControl(raw,"VOIDCHAIN_INGRESS_OUTPUT_DIR"));
  if(!path.isAbsolute(output)||isInside(ROOT,output)){
    fail("VOIDCHAIN_INGRESS_OUTPUT_MUST_BE_OUTSIDE_REPOSITORY");
  }
  if(fs.existsSync(output)) fail("VOIDCHAIN_INGRESS_OUTPUT_ALREADY_EXISTS");
  const parent=path.dirname(output);
  let realParent;
  let parentStat;
  try{
    realParent=fs.realpathSync.native(parent);
    parentStat=fs.lstatSync(parent);
  }catch{
    fail("VOIDCHAIN_INGRESS_OUTPUT_PARENT_UNAVAILABLE");
  }
  if(realParent!==parent||parentStat.isSymbolicLink()||!parentStat.isDirectory()){
    fail("VOIDCHAIN_INGRESS_OUTPUT_PARENT_INVALID");
  }
  return output;
}

function writeExclusive(file,text,mode=0o600){
  fs.writeFileSync(file,text,{encoding:"utf8",flag:"wx",mode});
  const fd=fs.openSync(file,"r+");
  try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}

function fileEntry(file){
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink()||!stat.isFile()){
    fail("VOIDCHAIN_INGRESS_PACKET_FILE_INVALID:"+path.basename(file));
  }
  const bytes=fs.readFileSync(file);
  return Object.freeze({
    bytes:String(bytes.length),
    sha256:sha256(bytes),
    mode:(stat.mode&0o777).toString(8).padStart(4,"0"),
  });
}

function packetBody({
  repository,tunnelId,credential,cloudflared,generatedFiles,
}){
  return Object.freeze({
    marker:VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1,
    schema:SCHEMA,
    version:1,
    hostname:HOSTNAME,
    public_origin:PUBLIC_ORIGIN,
    tunnel_id:tunnelId,
    repository,
    frontdoor:Object.freeze({
      bind:"127.0.0.1",
      port:8083,
      origin:FRONTDOOR_ORIGIN,
      status_path:FRONTDOOR_STATUS_PATH,
      marker:FRONTDOOR_MARKER,
      upstream_origin:"http://127.0.0.1:8082",
      upstream_marker:COMPOSITION_MARKER,
      upstream_runtime_truth_marker:RUNTIME_TRUTH_MARKER,
      readiness_bound_to_current_upstream:true,
      loopback_only:true,
    }),
    precision_recovery_prerequisite:Object.freeze({
      issue:1618,
      source_contract_present:true,
      independent_live_host_acceptance_required:true,
      independent_live_host_acceptance_claimed:false,
    }),
    credential,
    cloudflared,
    generated_files:generatedFiles,
    path_contract:Object.freeze({
      hostname:HOSTNAME,
      service:FRONTDOOR_ORIGIN,
      cloudflared_path_rule:null,
      prefix_strip:false,
      path_rewrite:false,
      frontdoor_proxy_uses_original_request_url:true,
      catch_all_service:"http_status:404",
      private_routes_exposed:false,
    }),
    activation:Object.freeze({
      packet_inert:true,
      install_plan_defined:false,
      rollback_plan_defined:false,
      services_started:false,
      unit_installed:false,
      dns_changed:false,
      tls_changed:false,
      tunnel_started:false,
      public_ingress_qualified:false,
      external_path_preservation_accepted:false,
    }),
    authority:
      VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V1,
  });
}

function parsePacket(file){
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size<2||stat.size>MAX_PACKET_FILE_BYTES){
    fail("VOIDCHAIN_INGRESS_PACKET_JSON_INVALID");
  }
  if((stat.mode&0o777)!==0o600){
    fail("VOIDCHAIN_INGRESS_PACKET_JSON_MODE_INVALID");
  }
  const bytes=fs.readFileSync(file);
  let value;
  try{value=JSON.parse(bytes.toString("utf8"));}catch{
    fail("VOIDCHAIN_INGRESS_PACKET_JSON_PARSE_FAILED");
  }
  return exactObject(value,PACKET_KEYS,"VOIDCHAIN_INGRESS_PACKET_SHAPE_INVALID");
}

function requireGeneratedFile(packetDir,name,expectedText,entry){
  if(!plain(entry)) fail("VOIDCHAIN_INGRESS_PACKET_FILE_ENTRY_INVALID:"+name);
  const file=path.join(packetDir,name);
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink()||!stat.isFile()||(stat.mode&0o777)!==0o600){
    fail("VOIDCHAIN_INGRESS_PACKET_FILE_MODE_INVALID:"+name);
  }
  const bytes=fs.readFileSync(file);
  if(bytes.length>MAX_PACKET_FILE_BYTES){
    fail("VOIDCHAIN_INGRESS_PACKET_FILE_TOO_LARGE:"+name);
  }
  if(bytes.toString("utf8")!==expectedText){
    fail("VOIDCHAIN_INGRESS_PACKET_FILE_CONTENT_MISMATCH:"+name);
  }
  if(
    entry.bytes!==String(bytes.length)||
    entry.sha256!==sha256(bytes)||
    entry.mode!=="0600"
  ){
    fail("VOIDCHAIN_INGRESS_PACKET_FILE_IDENTITY_MISMATCH:"+name);
  }
}

export function prepareVoidchainPathPreservingIngressPlanV1(input={}){
  const request=exactObject(
    input,
    [
      "tunnel_id",
      "credentials_file",
      "cloudflared_path",
      "expected_cloudflared_sha256",
      "expected_repository_head",
      "output_dir",
    ],
    "VOIDCHAIN_INGRESS_PREPARE_INPUT_SHAPE_INVALID",
  );
  const repository=bindRepositorySource(request.expected_repository_head);
  const tunnelId=normalizeTunnelId(request.tunnel_id);
  const credential=credentialMetadata(request.credentials_file,tunnelId);
  const cloudflared=stableFileSha256(
    request.cloudflared_path,
    request.expected_cloudflared_sha256,
    "VOIDCHAIN_INGRESS_CLOUDFLARED",
  );
  const outputDir=normalizeOutputDir(request.output_dir);

  fs.mkdirSync(outputDir,{mode:0o700});
  fs.chmodSync(outputDir,0o700);
  const configPath=path.join(outputDir,"cloudflared-config.yml");
  const unitPath=path.join(outputDir,"void-voidchain-ingress-v1.service");
  const instructionPath=path.join(outputDir,"REVIEW.txt");
  const config=renderConfig({
    tunnelId,
    credentialPath:credential.path,
  });
  const unit=renderUnit({
    cloudflaredPath:cloudflared.path,
    configPath,
    tunnelId,
  });
  const instructions=renderInstructions({
    outputDir,
    head:repository.head,
  });
  writeExclusive(configPath,config);
  writeExclusive(unitPath,unit);
  writeExclusive(instructionPath,instructions);

  const generatedFiles=Object.freeze({
    "cloudflared-config.yml":fileEntry(configPath),
    "void-voidchain-ingress-v1.service":fileEntry(unitPath),
    "REVIEW.txt":fileEntry(instructionPath),
  });
  const body=packetBody({
    repository,
    tunnelId,
    credential,
    cloudflared,
    generatedFiles,
  });
  const packet=Object.freeze({
    ...body,
    plan_id:"voidvci1_"+sha256(Buffer.from(canonicalJson(body),"utf8")),
  });
  const packetPath=path.join(outputDir,"packet.json");
  writeExclusive(packetPath,JSON.stringify(packet,null,2)+"\n");
  const dirFd=fs.openSync(outputDir,"r");
  try{fs.fsyncSync(dirFd);}finally{fs.closeSync(dirFd);}
  return packet;
}

export function verifyVoidchainPathPreservingIngressPlanV1({packet_dir}={}){
  const packetDir=path.resolve(
    rejectControl(packet_dir,"VOIDCHAIN_INGRESS_PACKET_DIR"),
  );
  if(!path.isAbsolute(packetDir)||isInside(ROOT,packetDir)){
    fail("VOIDCHAIN_INGRESS_PACKET_DIR_INVALID");
  }
  const stat=fs.lstatSync(packetDir);
  if(stat.isSymbolicLink()||!stat.isDirectory()||(stat.mode&0o077)!==0){
    fail("VOIDCHAIN_INGRESS_PACKET_DIR_CUSTODY_INVALID");
  }

  const packet=parsePacket(path.join(packetDir,"packet.json"));
  if(
    packet.marker!==VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1||
    packet.schema!==SCHEMA||
    packet.version!==1||
    packet.hostname!==HOSTNAME||
    packet.public_origin!==PUBLIC_ORIGIN||
    typeof packet.plan_id!=="string"||
    !PLAN_ID.test(packet.plan_id)
  ){
    fail("VOIDCHAIN_INGRESS_PACKET_IDENTITY_INVALID");
  }

  const repository=bindRepositorySource(packet.repository?.head);
  if(canonicalJson(repository)!==canonicalJson(packet.repository)){
    fail("VOIDCHAIN_INGRESS_REPOSITORY_BINDING_MISMATCH");
  }
  const tunnelId=normalizeTunnelId(packet.tunnel_id);
  const credential=credentialMetadata(packet.credential?.path,tunnelId);
  if(canonicalJson(credential)!==canonicalJson(packet.credential)){
    fail("VOIDCHAIN_INGRESS_CREDENTIAL_METADATA_CHANGED");
  }
  const cloudflared=stableFileSha256(
    packet.cloudflared?.path,
    packet.cloudflared?.sha256,
    "VOIDCHAIN_INGRESS_CLOUDFLARED",
  );
  if(canonicalJson(cloudflared)!==canonicalJson(packet.cloudflared)){
    fail("VOIDCHAIN_INGRESS_CLOUDFLARED_IDENTITY_CHANGED");
  }

  const fileKeys=Object.keys(packet.generated_files||{}).sort();
  const expectedKeys=[
    "REVIEW.txt",
    "cloudflared-config.yml",
    "void-voidchain-ingress-v1.service",
  ];
  if(canonicalJson(fileKeys)!==canonicalJson(expectedKeys)){
    fail("VOIDCHAIN_INGRESS_GENERATED_FILE_SET_INVALID");
  }

  const config=renderConfig({
    tunnelId,
    credentialPath:credential.path,
  });
  const unit=renderUnit({
    cloudflaredPath:cloudflared.path,
    configPath:path.join(packetDir,"cloudflared-config.yml"),
    tunnelId,
  });
  const instructions=renderInstructions({
    outputDir:packetDir,
    head:repository.head,
  });
  requireGeneratedFile(
    packetDir,
    "cloudflared-config.yml",
    config,
    packet.generated_files["cloudflared-config.yml"],
  );
  requireGeneratedFile(
    packetDir,
    "void-voidchain-ingress-v1.service",
    unit,
    packet.generated_files["void-voidchain-ingress-v1.service"],
  );
  requireGeneratedFile(
    packetDir,
    "REVIEW.txt",
    instructions,
    packet.generated_files["REVIEW.txt"],
  );

  const body={...packet};
  delete body.plan_id;
  const expectedPlanId=
    "voidvci1_"+sha256(Buffer.from(canonicalJson(body),"utf8"));
  if(packet.plan_id!==expectedPlanId){
    fail("VOIDCHAIN_INGRESS_PLAN_ID_MISMATCH");
  }

  if(
    packet.frontdoor?.origin!==FRONTDOOR_ORIGIN||
    packet.frontdoor?.status_path!==FRONTDOOR_STATUS_PATH||
    packet.frontdoor?.marker!==FRONTDOOR_MARKER||
    packet.frontdoor?.upstream_marker!==COMPOSITION_MARKER||
    packet.frontdoor?.upstream_runtime_truth_marker!==RUNTIME_TRUTH_MARKER||
    packet.frontdoor?.readiness_bound_to_current_upstream!==true||
    packet.frontdoor?.loopback_only!==true||
    packet.path_contract?.service!==FRONTDOOR_ORIGIN||
    packet.path_contract?.cloudflared_path_rule!==null||
    packet.path_contract?.prefix_strip!==false||
    packet.path_contract?.path_rewrite!==false||
    packet.path_contract?.frontdoor_proxy_uses_original_request_url!==true||
    packet.path_contract?.catch_all_service!=="http_status:404"||
    packet.path_contract?.private_routes_exposed!==false
  ){
    fail("VOIDCHAIN_INGRESS_PATH_CONTRACT_INVALID");
  }

  if(
    packet.precision_recovery_prerequisite?.issue!==1618||
    packet.precision_recovery_prerequisite?.source_contract_present!==true||
    packet.precision_recovery_prerequisite?.independent_live_host_acceptance_required!==true||
    packet.precision_recovery_prerequisite?.independent_live_host_acceptance_claimed!==false
  ){
    fail("VOIDCHAIN_INGRESS_PRECISION_RECOVERY_PREREQUISITE_INVALID");
  }

  for(const key of [
    "install_plan_defined",
    "rollback_plan_defined",
    "services_started",
    "unit_installed",
    "dns_changed",
    "tls_changed",
    "tunnel_started",
    "public_ingress_qualified",
    "external_path_preservation_accepted",
  ]){
    if(packet.activation?.[key]!==false){
      fail("VOIDCHAIN_INGRESS_ACTIVATION_MUST_REMAIN_FALSE:"+key);
    }
  }
  if(packet.activation?.packet_inert!==true){
    fail("VOIDCHAIN_INGRESS_PACKET_MUST_REMAIN_INERT");
  }

  const authority=exactObject(
    packet.authority,
    Object.keys(VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V1),
    "VOIDCHAIN_INGRESS_AUTHORITY_SHAPE_INVALID",
  );
  if(
    canonicalJson(authority)!==
      canonicalJson(VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V1)
  ){
    fail("VOIDCHAIN_INGRESS_AUTHORITY_MISMATCH");
  }

  return Object.freeze({
    ok:true,
    status:"VOIDCHAIN_INGRESS_PLAN_VERIFIED_INERT",
    marker:VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1,
    plan_id:packet.plan_id,
    hostname:HOSTNAME,
    public_origin:PUBLIC_ORIGIN,
    frontdoor_origin:FRONTDOOR_ORIGIN,
    path_preserving:true,
    exact_current_source_bound:true,
    cloudflared_executable_bound:true,
    credential_metadata_bound_without_content_read:true,
    precision_recovery_independent_acceptance_required:true,
    installation_authorized:false,
    ingress_activation_authorized:false,
    independent_public_acceptance:false,
    authority:
      VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V1,
  });
}

function parseCli(argv){
  const [command,...rest]=argv;
  const values=Object.create(null);
  for(let i=0;i<rest.length;i+=1){
    const key=rest[i];
    if(!key.startsWith("--")) fail("VOIDCHAIN_INGRESS_CLI_ARGUMENT_INVALID");
    const value=rest[i+1];
    if(value===undefined||value.startsWith("--")){
      fail("VOIDCHAIN_INGRESS_CLI_ARGUMENT_MISSING");
    }
    values[key.slice(2)]=value;
    i+=1;
  }
  return {command:command||"",values};
}

async function main(argv){
  const {command,values}=parseCli(argv);
  if(command==="prepare"){
    for(const key of [
      "tunnel-id",
      "credentials-file",
      "cloudflared",
      "expected-cloudflared-sha256",
      "expected-head",
      "output",
    ]){
      if(!values[key]) fail("VOIDCHAIN_INGRESS_CLI_REQUIRED:"+key);
    }
    const packet=prepareVoidchainPathPreservingIngressPlanV1({
      tunnel_id:values["tunnel-id"],
      credentials_file:path.resolve(values["credentials-file"]),
      cloudflared_path:path.resolve(values.cloudflared),
      expected_cloudflared_sha256:values["expected-cloudflared-sha256"],
      expected_repository_head:values["expected-head"],
      output_dir:path.resolve(values.output),
    });
    console.log(VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1);
    console.log("status=VOIDCHAIN_INGRESS_PLAN_PREPARED_INERT");
    console.log("plan_id="+packet.plan_id);
    console.log("hostname="+packet.hostname);
    console.log("frontdoor_origin="+packet.frontdoor.origin);
    console.log("credentials_content_read=false");
    console.log("cloudflared_execution=false");
    console.log("installation_authorized=false");
    console.log("ingress_activation_authorized=false");
    console.log("independent_public_acceptance=false");
    return;
  }
  if(command==="verify"){
    if(!values.packet||Object.keys(values).length!==1){
      fail("VOIDCHAIN_INGRESS_VERIFY_ARGUMENTS_INVALID");
    }
    const verified=verifyVoidchainPathPreservingIngressPlanV1({
      packet_dir:path.resolve(values.packet),
    });
    console.log(VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1);
    console.log("status="+verified.status);
    console.log("plan_id="+verified.plan_id);
    console.log("path_preserving=true");
    console.log("installation_authorized=false");
    console.log("ingress_activation_authorized=false");
    console.log("independent_public_acceptance=false");
    return;
  }
  fail("VOIDCHAIN_INGRESS_USAGE: prepare|verify");
}

const direct=
  process.argv[1]&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);

if(direct){
  main(process.argv.slice(2)).catch((error)=>{
    console.error(VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1+"_HOLD");
    console.error(error instanceof Error?error.message:String(error));
    process.exitCode=2;
  });
}
