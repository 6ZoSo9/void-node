#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath, pathToFileURL} from "node:url";

const MARKER="VOID_PUBLIC_RELEASE_CHANNEL_BUILDER_V1";
function fail(m){console.error(`ERROR: ${m}`);process.exit(1);}
function sha(p){return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");}
function stable(v){
  if(v===null||typeof v!=="object")return v;
  if(Array.isArray(v))return v.map(stable);
  const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;
}
function stableJson(v){return JSON.stringify(stable(v),null,2)+"\n";}
function parseSums(text){
  const out=new Map();
  for(const raw of text.split(/\r?\n/)){
    if(!raw.trim())continue;
    const m=raw.match(/^([0-9a-f]{64}) [ *](.+)$/);
    if(!m)fail(`invalid SHA256SUMS line: ${raw}`);
    if(out.has(m[2]))fail(`duplicate SHA256SUMS entry: ${m[2]}`);
    out.set(m[2],m[1]);
  }
  return out;
}
function validateUrl(s, allowFile){
  const u=new URL(s);
  if(u.protocol==="https:")return u;
  if(allowFile&&u.protocol==="file:")return u;
  fail(`release channel asset URL must be HTTPS${allowFile?" or test file://":""}: ${s}`);
}
function validateChannel(j, allowFile){
  if(j?.marker!=="VOID_PUBLIC_RELEASE_CHANNEL_V1"||j?.schema_version!==1)fail("invalid release channel marker/schema");
  if(!["stable","candidate"].includes(j.channel))fail("invalid channel name");
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(j.repository||""))fail("invalid repository");
  if(!/^release-v[0-9A-Za-z][0-9A-Za-z._+-]{0,127}$/.test(j.release_tag||""))fail("invalid release tag");
  if(!/^[0-9a-f]{40}$/.test(j.release?.git_commit||""))fail("invalid release commit");
  if(!/^[0-9a-f]{64}$/.test(j.release?.archive_sha256||""))fail("invalid archive hash");
  if(j.release?.platform!=="linux-x64"||j.release?.minimum_node_major!==22)fail("unsupported release platform/runtime");
  for(const [key,a] of Object.entries(j.assets||{})){
    if(!a||typeof a!=="object")fail(`invalid asset ${key}`);
    if(!/^[0-9a-f]{64}$/.test(a.sha256||""))fail(`invalid asset hash ${key}`);
    if(!Number.isSafeInteger(a.bytes)||a.bytes<1)fail(`invalid asset bytes ${key}`);
    validateUrl(a.url,allowFile);
  }
  for(const k of ["archive","installer","manifest","checksums","sbom"]){if(!j.assets?.[k])fail(`missing required channel asset ${k}`);}
  if(j.assets.archive.sha256!==j.release.archive_sha256)fail("archive hash mismatch between release and assets");
  if(j.verification?.checksum_algorithm!=="sha256"||j.verification?.github_attestation_required!==true)fail("channel must require SHA-256 and GitHub attestation");
  if(j.policy?.downgrade_allowed_by_default!==false||j.policy?.service_started_implicitly!==false||j.policy?.rollback_on_health_failure!==true||j.policy?.guarded_lanes_activated!==false)fail("unsafe channel policy");
  return j;
}

const args=process.argv.slice(2);let manifest="",checksums="",baseUrl="",out="stable-v1.json",channel="stable",repository="6ZoSo9/void-node",releaseTag="",verify="",allowFile=false;
for(let i=0;i<args.length;i++){
  const a=args[i];
  if(a==="--manifest")manifest=args[++i]||fail("--manifest needs a file");
  else if(a==="--checksums")checksums=args[++i]||fail("--checksums needs a file");
  else if(a==="--base-url")baseUrl=args[++i]||fail("--base-url needs a URL");
  else if(a==="--out")out=args[++i]||fail("--out needs a file");
  else if(a==="--channel")channel=args[++i]||fail("--channel needs a value");
  else if(a==="--repository")repository=args[++i]||fail("--repository needs owner/repo");
  else if(a==="--release-tag")releaseTag=args[++i]||fail("--release-tag needs a tag");
  else if(a==="--verify")verify=args[++i]||fail("--verify needs a file");
  else if(a==="--test-allow-file")allowFile=true;
  else if(a==="--help"){console.log("build-public-release-channel-v1.mjs --manifest FILE --checksums FILE --base-url URL --release-tag TAG [--out FILE] [--verify FILE] [--test-allow-file]");process.exit(0);}
  else fail(`unknown argument: ${a}`);
}
if(verify){
  const j=validateChannel(JSON.parse(fs.readFileSync(verify,"utf8")),allowFile);
  if(allowFile){
    for(const [key,a] of Object.entries(j.assets)){
      const u=new URL(a.url);if(u.protocol!=="file:")continue;
      const p=fileURLToPath(u);if(!fs.existsSync(p))fail(`missing file asset ${key}: ${p}`);
      if(sha(p)!==a.sha256)fail(`file asset checksum mismatch ${key}`);
      if(fs.statSync(p).size!==a.bytes)fail(`file asset size mismatch ${key}`);
    }
  }
  console.log(`${MARKER}_VERIFY_GREEN`);process.exit(0);
}
if(!manifest||!checksums||!baseUrl||!releaseTag)fail("--manifest, --checksums, --base-url, and --release-tag are required");
if(!["stable","candidate"].includes(channel))fail("--channel must be stable or candidate");
const m=JSON.parse(fs.readFileSync(manifest,"utf8"));
if(m.marker!=="VOID_PUBLIC_RELEASE_MANIFEST_V1"||m.schema_version!==1)fail("invalid release manifest");
if(!/^[0-9a-f]{40}$/.test(m.git_commit||""))fail("invalid release manifest commit");
const sums=parseSums(fs.readFileSync(checksums,"utf8"));
const dir=path.dirname(path.resolve(manifest));
const base=validateUrl(baseUrl.replace(/\/$/,"")+"/",allowFile);
const names={archive:m.archive,installer:m.installer,manifest:path.basename(manifest),checksums:path.basename(checksums),sbom:m.sbom,release_notes:m.release_notes};
const assets={};
for(const [key,name] of Object.entries(names)){
  if(!name)continue;
  const p=key==="checksums"?path.resolve(checksums):key==="manifest"?path.resolve(manifest):path.join(dir,name);
  if(!fs.existsSync(p))fail(`missing release asset ${key}: ${p}`);
  const digest=sha(p);
  if(key!=="checksums"&&sums.get(name)!==digest)fail(`SHA256SUMS mismatch for ${name}`);
  assets[key]={name,url:new URL(encodeURIComponent(name).replace(/%2F/g,"/"),base).toString(),sha256:digest,bytes:fs.statSync(p).size};
}
if(assets.archive.sha256!==m.archive_sha256||assets.archive.bytes!==m.archive_bytes)fail("manifest archive binding mismatch");
const j={
  marker:"VOID_PUBLIC_RELEASE_CHANNEL_V1",schema_version:1,channel,
  generated_at_utc:m.built_at_utc,repository,release_tag:releaseTag,
  release:{version:m.version,git_commit:m.git_commit,platform:m.platform,minimum_node_major:m.minimum_node_major,archive:m.archive,archive_sha256:m.archive_sha256,archive_bytes:m.archive_bytes},
  assets,
  verification:{checksum_algorithm:"sha256",github_attestation_required:true,attestation_repository:repository,attestation_subjects:[m.archive,m.installer,path.basename(manifest)]},
  policy:{downgrade_allowed_by_default:false,service_started_implicitly:false,restart_requires_explicit_flag:true,health_gate_for_running_service:true,rollback_on_health_failure:true,guarded_lanes_activated:false}
};
validateChannel(j,allowFile);
fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,stableJson(j));
console.log(`${MARKER}_GREEN`);console.log(`channel=${channel}`);console.log(`version=${m.version}`);console.log(`out=${path.resolve(out)}`);console.log("service_started_implicitly=false");console.log("guarded_lanes_activated=false");
