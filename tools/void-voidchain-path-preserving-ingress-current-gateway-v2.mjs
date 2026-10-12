#!/usr/bin/env node
// Versioned source-only successor to frozen ingress V1 (blob
// 92d3cfb85596a25e9d1e39dbcf549b3aa7a37ee5). This executable is a
// deliberately minimal generation change: current checkout gateway blob,
// new marker/schema/plan ID and unchanged fail-closed ingress constraints.
// It does NOT accept/modify the installed Precision routing or real secrets.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_CURRENT_GATEWAY_V2 =
  "VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_CURRENT_GATEWAY_V2";

export const VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V2 =
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
const SCHEMA="void.voidchain-path-preserving-ingress-current-gateway.v2";
const MAX_EXECUTABLE_BYTES=256*1024*1024;
const MAX_PACKET_FILE_BYTES=2*1024*1024;
const HEX40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const PLAN_ID=/^voidvci2_[0-9a-f]{64}$/u;

const SOURCE_BLOBS=Object.freeze({
  "ops/public/void-public-frontdoor-v1.mjs":
    "b1513ea822e32fe5df55c00ab635128b07aaf170",
  "scripts/prove_void_public_frontdoor_v1.mjs":
    "05b04307e8839b0de9aaef3fd0882ec9e298a965",
  // Reviewed source-generation successor #2631: exact private operator ingress deny.
  // Historical predecessor gateway: e97ce051405d5b19a363eaf0834838a0ecef3a10.
  "ops/public/void-public-app-composition-gateway-v1.mjs":
    "0f7b7ccec7aecbcfe6a48df1cd28063dc6550131",
  "ops/public/run-void-public-app-composition-gateway-v1.sh":
    "e9b74924304985d87e00972db61f29a607f19124",
  "ops/systemd/user/void-public-app-composition-gateway-v1.service.example":
    "d7add3da6d34bece418084c877cd4be667495ffb",
  "ops/public/public-seed-adapter-v1.mjs":
    "60158fa63c7fafc55738d4b5a021cc021983812a",
  "ops/public/run-public-seed-adapter-v1.sh":
    "bc5f5d8c277c114b007a5676015729ec25fc09dd",
  // Precision plan successor retains the exact reviewed-generation guard.
  "tools/void-precision-web-recovery-evidence-v1.mjs":
    "fca92451258bfd5446cb675530dbdb70b6ecf5df",
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

export function buildVoidchainIngressGitInvocationV2(args){
  if(
    !Array.isArray(args)||
    args.some((value)=>
      typeof value!=="string"||
      value.length===0||
      value.length>4096||
      /[\0\r\n]/u.test(value)
    )
  ){
    fail("VOIDCHAIN_INGRESS_GIT_ARGUMENT_INVALID");
  }
  return Object.freeze({
    executable:GIT,
    args:Object.freeze([
      "--no-replace-objects",
      "-c","core.fsmonitor=false",
      "-c","core.hooksPath=/dev/null",
      "-c","core.attributesFile=/dev/null",
      "-c","core.preloadIndex=false",
      "-c","core.untrackedCache=false",
      "-c","submodule.recurse=false",
      "-c","core.bare=false",
      "-c","core.worktree="+ROOT,
      "-C",ROOT,
      ...args,
    ]),
    env:Object.freeze({
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      XDG_CONFIG_HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",
      GIT_ASKPASS:"/bin/false",
    }),
  });
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
  const invocation=buildVoidchainIngressGitInvocationV2(args);
  const result=spawnSync(
    invocation.executable,
    [...invocation.args],
    {
      encoding,
      stdio:["ignore","pipe","pipe"],
      env:{...invocation.env},
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
    ['"/__void/buy-void/operator"',
      "VOIDCHAIN_INGRESS_PRIVATE_BUY_OPERATOR_DENY_MISSING"],
    ['canonical = decodeURIComponent(pathname).toLowerCase();',
      "VOIDCHAIN_INGRESS_OPERATOR_ALIAS_NORMALIZATION_MISSING"],
    ['if (canonical.includes("%")) return true;',
      "VOIDCHAIN_INGRESS_NESTED_ENCODED_PRIVATE_PATH_HOLD_MISSING"],
    // Only the exact newly reviewed gateway generation is admitted; its
    // public checkout path must remain one narrow POST, with fail-closed
    // buyer receipt and uncertain-retry contracts.
    ["VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1",
      "VOIDCHAIN_INGRESS_CURRENT_CHECKOUT_MARKER_MISSING"],
    ['"/__void/buy-void/request"',
      "VOIDCHAIN_INGRESS_CURRENT_CHECKOUT_ROUTE_MISSING"],
    ["VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_UPSTREAM_TIMEOUT_MS",
      "VOIDCHAIN_INGRESS_CURRENT_CHECKOUT_DEADLINE_MISSING"],
    ["submission_outcome",
      "VOIDCHAIN_INGRESS_CURRENT_UNCERTAIN_SUBMISSION_MISSING"],
    ["automatic_retry_safe",
      "VOIDCHAIN_INGRESS_CURRENT_AUTO_RETRY_HOLD_MISSING"],
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
    "Description=VOID voidchain.org path-preserving ingress current gateway v2",
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
    "VOID voidchain.org path-preserving ingress current gateway plan v2",
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
  // An existing destination can be resumed only after exact private custody
  // and immutable-byte validation. No silent chmod, deletion or overwrite.
  let existing=null;
  try { existing=fs.lstatSync(output); }
  catch(error){ if(error?.code!=="ENOENT") fail("VOIDCHAIN_INGRESS_OUTPUT_LSTAT_UNAVAILABLE"); }
  if(existing){
    let real;
    try { real=fs.realpathSync.native(output); }
    catch { fail("VOIDCHAIN_INGRESS_OUTPUT_PATH_UNAVAILABLE"); }
    if(real!==output||!existing.isDirectory()||existing.isSymbolicLink()||
       (existing.mode&0o7777)!==0o700||
       existing.uid!==process.getuid?.()){
      fail("VOIDCHAIN_INGRESS_OUTPUT_EXISTING_CUSTODY_HOLD");
    }
  }
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

// Pin one directory inode for all create-only writes and previous-leaf reads.
// The caller must keep this FD until final directory fsync and path rebind.
function assertPinnedOutputDirectoryV2(output,fd){
  let visible;
  let opened;
  try {
    visible=fs.lstatSync(output,{bigint:true});
    opened=fs.fstatSync(fd,{bigint:true});
  }catch{fail("VOIDCHAIN_INGRESS_OUTPUT_DIR_INODE_UNAVAILABLE");}
  if(!visible.isDirectory()||visible.isSymbolicLink()||
     !opened.isDirectory()||opened.dev!==visible.dev||
     opened.ino!==visible.ino||opened.uid!==visible.uid||
     opened.gid!==visible.gid||opened.mode!==visible.mode||
     opened.uid!==BigInt(process.getuid?.()??-1)||
     (opened.mode&0o7777n)!==0o700n){
    fail("VOIDCHAIN_INGRESS_OUTPUT_DIR_REBOUND_OR_INSECURE");
  }
}

function expectedOutputEntryV2(text){
  const bytes=Buffer.from(text,"utf8");
  if(bytes.length<1||bytes.length>MAX_PACKET_FILE_BYTES){
    fail("VOIDCHAIN_INGRESS_EXPECTED_OUTPUT_SIZE_HOLD");
  }
  return Object.freeze({
    bytes:String(bytes.length),
    sha256:sha256(bytes),
    mode:"0600",
  });
}

function assertExistingOutputLeafV2(file,expected){
  let fd;
  try {
    fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  }catch{fail("VOIDCHAIN_INGRESS_RESUME_LEAF_UNAVAILABLE:"+path.basename(file));}
  try {
    const before=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(file,{bigint:true});
    const owner=BigInt(process.getuid?.()??-1);
    if(!before.isFile()||visible.isSymbolicLink()||!visible.isFile()||
       before.dev!==visible.dev||before.ino!==visible.ino||
       before.uid!==owner||visible.uid!==owner||
       before.uid!==visible.uid||before.gid!==visible.gid||
       before.mode!==visible.mode||before.nlink!==1n||
       visible.nlink!==1n||(before.mode&0o7777n)!==0o600n||
       before.size!==BigInt(expected.length)){
      fail("VOIDCHAIN_INGRESS_RESUME_LEAF_IDENTITY_HOLD:"+path.basename(file));
    }
    const observed=Buffer.alloc(expected.length);
    for(let offset=0;offset<observed.length;){
      const read=fs.readSync(fd,observed,offset,observed.length-offset,offset);
      if(read<=0)fail("VOIDCHAIN_INGRESS_RESUME_LEAF_SHORT_READ:"+path.basename(file));
      offset+=read;
    }
    const after=fs.fstatSync(fd,{bigint:true});
    const still=fs.lstatSync(file,{bigint:true});
    if(!observed.equals(expected)||
       ["dev","ino","size","uid","gid","mode","nlink","mtimeNs","ctimeNs"]
         .some(key=>before[key]!==after[key]||after[key]!==still[key])){
      fail("VOIDCHAIN_INGRESS_RESUME_LEAF_CONTENT_OR_SOURCE_DRIFT:"+path.basename(file));
    }
    // Complete any interrupted fsync only AFTER proving exact retained bytes.
    fs.fsyncSync(fd);
  }finally{
    if(fd!==undefined)fs.closeSync(fd);
  }
}

function publishOrVerifyOutputLeafV2(file,text,wasPresent){
  const expected=Buffer.from(text,"utf8");
  if(expected.length<1||expected.length>MAX_PACKET_FILE_BYTES){
    fail("VOIDCHAIN_INGRESS_PUBLISH_BYTES_INVALID:"+path.basename(file));
  }
  if(wasPresent){
    assertExistingOutputLeafV2(file,expected);
    return;
  }
  const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|
    fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
  try {
    let written=0;
    while(written<expected.length){
      const n=fs.writeSync(fd,expected,written,expected.length-written,written);
      if(n<=0)fail("VOIDCHAIN_INGRESS_PUBLISH_SHORT_WRITE:"+path.basename(file));
      written+=n;
    }
    fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
  assertExistingOutputLeafV2(file,expected);
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
    marker:VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_CURRENT_GATEWAY_V2,
    schema:SCHEMA,
    version:2,
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
      VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V2,
  });
}

// Independently verify packet leaf custody through a single O_NOFOLLOW FD.
// A matching checksum alone cannot authorize an exported hard-link alias.
// Keep descriptor and visible path bound across the entire bounded read.
function readPinnedPacketLeafV2(file,{isPacketJson=false}={}){
  const name=path.basename(file);
  let fd;
  try {
    fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  } catch {
    fail("VOIDCHAIN_INGRESS_PACKET_LEAF_OPEN_HOLD:"+name);
  }
  try {
    let before,visible;
    try {
      before=fs.fstatSync(fd,{bigint:true});
      visible=fs.lstatSync(file,{bigint:true});
    } catch {
      fail("VOIDCHAIN_INGRESS_PACKET_LEAF_IDENTITY_UNAVAILABLE:"+name);
    }
    const owner=BigInt(process.getuid?.()??-1);
    if(!before.isFile()||!visible.isFile()||visible.isSymbolicLink()||
       before.dev!==visible.dev||before.ino!==visible.ino||
       before.uid!==owner||visible.uid!==owner||
       before.uid!==visible.uid||before.gid!==visible.gid||
       before.mode!==visible.mode||before.nlink!==1n||
       visible.nlink!==1n){
      fail("VOIDCHAIN_INGRESS_PACKET_LEAF_CUSTODY_INVALID:"+name);
    }
    if((before.mode&0o7777n)!==0o600n){
      fail(isPacketJson
        ? "VOIDCHAIN_INGRESS_PACKET_JSON_MODE_INVALID"
        : "VOIDCHAIN_INGRESS_PACKET_FILE_MODE_INVALID:"+name);
    }
    if(before.size<1n||before.size>BigInt(MAX_PACKET_FILE_BYTES)){
      fail("VOIDCHAIN_INGRESS_PACKET_LEAF_SIZE_INVALID:"+name);
    }
    const bytes=Buffer.alloc(Number(before.size));
    for(let offset=0;offset<bytes.length;){
      let n;
      try {n=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);}
      catch {fail("VOIDCHAIN_INGRESS_PACKET_LEAF_READ_HOLD:"+name);}
      if(n<=0)fail("VOIDCHAIN_INGRESS_PACKET_LEAF_SHORT_READ:"+name);
      offset+=n;
    }
    let after,still;
    try{
      after=fs.fstatSync(fd,{bigint:true});
      still=fs.lstatSync(file,{bigint:true});
    }catch{
      fail("VOIDCHAIN_INGRESS_PACKET_LEAF_STABILITY_UNAVAILABLE:"+name);
    }
    if(["dev","ino","size","uid","gid","mode","nlink","mtimeNs","ctimeNs"]
      .some(key=>before[key]!==after[key]||after[key]!==still[key])||
       !after.isFile()||still.isSymbolicLink()){
      fail("VOIDCHAIN_INGRESS_PACKET_LEAF_STABILITY_HOLD:"+name);
    }
    return bytes;
  } finally {
    try {fs.closeSync(fd);}
    catch {fail("VOIDCHAIN_INGRESS_PACKET_LEAF_CLOSE_HOLD:"+name);}
  }
}

function parsePacket(file){
  const bytes=readPinnedPacketLeafV2(file,{isPacketJson:true});
  if(bytes.length<2) fail("VOIDCHAIN_INGRESS_PACKET_JSON_INVALID");
  let value;
  try{value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
  catch {fail("VOIDCHAIN_INGRESS_PACKET_JSON_PARSE_FAILED");}
  return exactObject(value,PACKET_KEYS,"VOIDCHAIN_INGRESS_PACKET_SHAPE_INVALID");
}

function requireGeneratedFile(packetDir,name,expectedText,entry){
  const expectedEntry=expectedOutputEntryV2(expectedText);
  const qualified=exactObject(
    entry,["bytes","sha256","mode"],
    "VOIDCHAIN_INGRESS_PACKET_FILE_ENTRY_INVALID:"+name,
  );
  if(canonicalJson(qualified)!==canonicalJson(expectedEntry)){
    fail("VOIDCHAIN_INGRESS_PACKET_FILE_IDENTITY_MISMATCH:"+name);
  }
  const bytes=readPinnedPacketLeafV2(path.join(packetDir,name));
  if(!bytes.equals(Buffer.from(expectedText,"utf8"))){
    fail("VOIDCHAIN_INGRESS_PACKET_FILE_CONTENT_MISMATCH:"+name);
  }
  if(qualified.bytes!==String(bytes.length)||qualified.sha256!==sha256(bytes)){
    fail("VOIDCHAIN_INGRESS_PACKET_FILE_IDENTITY_MISMATCH:"+name);
  }
}

export function prepareVoidchainPathPreservingIngressCurrentGatewayV2(input={}){
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
  const configPath=path.join(outputDir,"cloudflared-config.yml");
  const unitPath=path.join(outputDir,"void-voidchain-ingress-current-gateway-v2.service");
  const instructionPath=path.join(outputDir,"REVIEW.txt");
  const config=renderConfig({tunnelId,credentialPath:credential.path});
  const unit=renderUnit({cloudflaredPath:cloudflared.path,configPath,tunnelId});
  const instructions=renderInstructions({outputDir,head:repository.head});

  // Source-bound expected packet is computed BEFORE publishing any file.
  // A resumed private output may contain only this exact subset of leaves;
  // conflicting/extra/symlinked/wrong-owner files HOLD without mutation.
  const leafText=Object.freeze({
    "cloudflared-config.yml":config,
    "void-voidchain-ingress-current-gateway-v2.service":unit,
    "REVIEW.txt":instructions,
  });
  const generatedFiles=Object.freeze(
    Object.fromEntries(Object.entries(leafText)
      .map(([name,txt])=>[name,expectedOutputEntryV2(txt)])));
  const body=packetBody({
    repository,tunnelId,credential,cloudflared,generatedFiles,
  });
  const packet=Object.freeze({
    ...body,
    plan_id:"voidvci2_"+sha256(Buffer.from(canonicalJson(body),"utf8")),
  });
  const packetText=JSON.stringify(packet,null,2)+"\n";
  const permitted=Object.freeze({
    ...leafText,
    "packet.json":packetText,
  });

  // O_EXCL at directory creation never overwrites another identity.
  // EEXIST is accepted only after an exact private inode and leaf census.
  try{fs.mkdirSync(outputDir,{mode:0o700});}
  catch(error){if(error?.code!=="EEXIST")throw error;}
  const dirFd=fs.openSync(outputDir,fs.constants.O_RDONLY|
    fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW);
  try{
    assertPinnedOutputDirectoryV2(outputDir,dirFd);
    const pinnedDir="/proc/self/fd/"+String(dirFd);
    const found=fs.readdirSync(pinnedDir);
    const present=new Set(found);
    for(const name of found){
      if(!Object.hasOwn(permitted,name)){
        fail("VOIDCHAIN_INGRESS_RESUME_UNEXPECTED_ENTRY:"+name);
      }
      assertExistingOutputLeafV2(path.join(pinnedDir,name),
        Buffer.from(permitted[name],"utf8"));
    }
    // packet.json is the last published success marker. A packet alongside
    // absent predecessor leaves is inconsistent, never silently "repaired".
    if(present.has("packet.json")&&
       Object.keys(leafText).some(name=>!present.has(name))){
      fail("VOIDCHAIN_INGRESS_RESUME_PREMATURE_PACKET");
    }
    for(const [name,text] of Object.entries(leafText)){
      publishOrVerifyOutputLeafV2(path.join(pinnedDir,name),
        text,present.has(name));
    }
    // Fully verify each expected predecessor before the final packet name.
    for(const [name,text] of Object.entries(leafText)){
      assertExistingOutputLeafV2(path.join(pinnedDir,name),
        Buffer.from(text,"utf8"));
    }
    assertPinnedOutputDirectoryV2(outputDir,dirFd);
    publishOrVerifyOutputLeafV2(path.join(pinnedDir,"packet.json"),
      packetText,present.has("packet.json"));
    fs.fsyncSync(dirFd);
    assertPinnedOutputDirectoryV2(outputDir,dirFd);
  }finally{
    fs.closeSync(dirFd);
  }
  return packet;
}

export function verifyVoidchainPathPreservingIngressCurrentGatewayV2({packet_dir}={}){
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
    packet.marker!==VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_CURRENT_GATEWAY_V2||
    packet.schema!==SCHEMA||
    packet.version!==2||
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
    "void-voidchain-ingress-current-gateway-v2.service",
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
    "void-voidchain-ingress-current-gateway-v2.service",
    unit,
    packet.generated_files["void-voidchain-ingress-current-gateway-v2.service"],
  );
  requireGeneratedFile(
    packetDir,
    "REVIEW.txt",
    instructions,
    packet.generated_files["REVIEW.txt"],
  );

  // Construct the whole expected packet from trusted source and renderer,
  // not from attacker-provided nested objects. A rehashed extra nested flag
  // (for example activation_authorized:true) is not a reviewable contract.
  const canonicalFiles=Object.freeze({
    "cloudflared-config.yml":expectedOutputEntryV2(config),
    "void-voidchain-ingress-current-gateway-v2.service":
      expectedOutputEntryV2(unit),
    "REVIEW.txt":expectedOutputEntryV2(instructions),
  });
  const qualifiedBody=packetBody({
    repository,tunnelId,credential,cloudflared,generatedFiles:canonicalFiles,
  });
  const suppliedBody={...packet};
  delete suppliedBody.plan_id;
  if(canonicalJson(suppliedBody)!==canonicalJson(qualifiedBody)){
    fail("VOIDCHAIN_INGRESS_PACKET_NESTED_CONTRACT_DRIFT");
  }
  const expectedPlanId="voidvci2_"+sha256(
    Buffer.from(canonicalJson(qualifiedBody),"utf8"),
  );
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
    Object.keys(VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V2),
    "VOIDCHAIN_INGRESS_AUTHORITY_SHAPE_INVALID",
  );
  if(
    canonicalJson(authority)!==
      canonicalJson(VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V2)
  ){
    fail("VOIDCHAIN_INGRESS_AUTHORITY_MISMATCH");
  }

  return Object.freeze({
    ok:true,
    status:"VOIDCHAIN_INGRESS_PLAN_VERIFIED_INERT",
    marker:VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_CURRENT_GATEWAY_V2,
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
      VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V2,
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
    const packet=prepareVoidchainPathPreservingIngressCurrentGatewayV2({
      tunnel_id:values["tunnel-id"],
      credentials_file:path.resolve(values["credentials-file"]),
      cloudflared_path:path.resolve(values.cloudflared),
      expected_cloudflared_sha256:values["expected-cloudflared-sha256"],
      expected_repository_head:values["expected-head"],
      output_dir:path.resolve(values.output),
    });
    console.log(VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_CURRENT_GATEWAY_V2);
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
    const verified=verifyVoidchainPathPreservingIngressCurrentGatewayV2({
      packet_dir:path.resolve(values.packet),
    });
    console.log(VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_CURRENT_GATEWAY_V2);
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
    console.error(VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_CURRENT_GATEWAY_V2+"_HOLD");
    console.error(error instanceof Error?error.message:String(error));
    process.exitCode=2;
  });
}
