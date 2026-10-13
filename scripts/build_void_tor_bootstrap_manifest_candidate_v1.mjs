#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildTorQualificationReceiptV1 } from "./qualify_void_public_seed_tor_v1.mjs";
import {
  TOR_NATIVE_DEFAULT_MAX_QUALIFICATION_AGE_MS,
  canonicalJson,
  contentId,
} from "./lib/void_tor_native_bootstrap_transport_v1.mjs";
import {
  TOR_BOOTSTRAP_CHAIN_ID,
  TOR_BOOTSTRAP_NETWORK,
  TOR_BOOTSTRAP_RELEASE_ROOT_FILENAME,
  classifyTorBootstrapSignedManifestLifecycle,
  loadTorBootstrapReleaseRootFile,
  torBootstrapManifestSigningPayload,
  validateTorBootstrapManifestContract,
  validateTorBootstrapReleaseRoot,
} from "./lib/void_tor_bootstrap_release_root_v1.mjs";

export const VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1 =
  "VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ROOT_FILE=path.join(ROOT,"config",TOR_BOOTSTRAP_RELEASE_ROOT_FILENAME);
const PREDECESSOR_FILE=path.join(ROOT,"public","bootstrap","tor-signed-v1.json");
const AUTHORITY_KEYS=["private_routes_exposed","wallet_authority","signer_authority","validator_authority","treasury_authority","work_credit_authority","money_movement_authority"];
const FALSE_AUTHORITY=Object.fromEntries(AUTHORITY_KEYS.map(key=>[key,false]));
const SHA40=/^[0-9a-f]{40}$/u;

function fail(message){throw new Error(String(message));}
function sha256(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
function readJson(raw,label){
  const file=path.resolve(String(raw||""));
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()||fs.realpathSync.native(file)!==file||st.size<2||st.size>2*1024*1024) fail(`${label} file invalid`);
  try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch(error){fail(`${label} JSON invalid: ${error?.message||error}`);}
}
function assertFalseAuthority(value,label){
  if(!value||typeof value!=="object"||Array.isArray(value)) fail(`${label} invalid`);
  if(JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...AUTHORITY_KEYS].sort())) fail(`${label} keys mismatch`);
  for(const key of AUTHORITY_KEYS) if(value[key]!==false) fail(`${label} ${key} must be false`);
}

export function validateTorQualificationReceiptForManifestV1(receipt,{expectedSourceSha,nowMs=Date.now()}={}){
  if(!SHA40.test(String(expectedSourceSha||""))) fail("expected source SHA invalid");
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt)) fail("qualification receipt invalid");
  if(receipt.schema!=="void_public_seed_tor_qualification_v1") fail("qualification receipt schema mismatch");
  if(receipt.source_sha!==expectedSourceSha) fail("qualification source SHA mismatch");
  if(receipt.manifest_published!==false) fail("qualification must remain unpublished evidence");
  if(receipt.transport?.protocol!=="tor-v3"||receipt.transport?.virtual_port!==80||receipt.transport?.socks_remote_dns!==true) fail("qualification transport mismatch");
  if(receipt.gateway_contract?.identity_header!=="x-void-public-seed-gateway: v1"||receipt.gateway_contract?.ready!==true||receipt.gateway_contract?.gap!==0||receipt.gateway_contract?.txroot_live!==1||receipt.gateway_contract?.exact_head_range!==true||receipt.gateway_contract?.private_mutation_routes_exposed!==false) fail("qualification gateway contract mismatch");
  assertFalseAuthority(receipt.authority,"qualification authority");
  const rebuilt=buildTorQualificationReceiptV1({
    sourceSha:receipt.source_sha,
    onionHostname:receipt.transport?.onion_hostname,
    virtualPort:receipt.transport?.virtual_port,
    socksHost:receipt.transport?.socks_proxy?.host,
    socksPort:receipt.transport?.socks_proxy?.port,
    observations:receipt.observations,
    generatedAt:receipt.generated_at,
  });
  if(canonicalJson(rebuilt)!==canonicalJson(receipt)) fail("qualification receipt not canonical/content-addressed");
  const qualifiedAt=Date.parse(receipt.generated_at);
  if(!Number.isFinite(qualifiedAt)||qualifiedAt>nowMs+2*60_000||nowMs-qualifiedAt>15*60_000) fail("qualification receipt freshness invalid");
  return Object.freeze(structuredClone(receipt));
}

export function buildTorBootstrapManifestCandidateV1({receipt,expectedSourceSha,validatedRoot,predecessor,nowMs=Date.now(),validityMinutes=90}={}){
  const q=validateTorQualificationReceiptForManifestV1(receipt,{expectedSourceSha,nowMs});
  const rootValidation=validateTorBootstrapReleaseRoot(validatedRoot?.root||validatedRoot,{allowHold:false});
  const root=rootValidation.root;
  if(!predecessor||!["active","authenticated_stale"].includes(predecessor.lifecycle)||predecessor.root?.root_id!==root.root_id||predecessor.validSignatureCount<root.threshold) fail("authenticated predecessor required");
  const old=predecessor.manifest?.onion_endpoints;
  const base=`http://${q.transport.onion_hostname}`;
  if(!Array.isArray(old)||old.length!==1||old[0]?.enabled!==true||old[0]?.base!==base) fail("canonical Tor onion identity changed");
  const minutes=Number(validityMinutes);
  if(!Number.isSafeInteger(minutes)||minutes<60||minutes>90) fail("validity minutes must be 60 through 90");
  const expiresMs=nowMs+minutes*60_000;
  if(expiresMs-Date.parse(q.generated_at)>TOR_NATIVE_DEFAULT_MAX_QUALIFICATION_AGE_MS) fail("manifest would outlive qualification freshness");
  const manifest={
    schema:"void_public_bootstrap_v1",network:TOR_BOOTSTRAP_NETWORK,chain_id:TOR_BOOTSTRAP_CHAIN_ID,status:"stable_tor_seed",
    generated_at:new Date(nowMs).toISOString(),expires_at:new Date(expiresMs).toISOString(),sync_endpoints:[],
    onion_endpoints:[{transport:"tor_v3_http",base,priority:0,enabled:true,temporary:false,qualification_id:q.qualification_id,qualified_at:q.generated_at,qualified_head:q.maximum_head}],
    private_tailnet_endpoints_published:false,authority:{...FALSE_AUTHORITY},
    notes:`Issue #2854 Tor renewal candidate; source_sha=${q.source_sha}; qualification_id=${q.qualification_id}; predecessor_manifest_id=${predecessor.manifestId}; signing_performed=false`,
    manifest_id:"",
  };
  manifest.manifest_id=contentId("voidpbm1_",manifest,"manifest_id");
  const checked=validateTorBootstrapManifestContract(manifest,nowMs);
  const payload=torBootstrapManifestSigningPayload(root,checked.manifest);
  return Object.freeze({manifest:checked.manifest,manifestId:checked.manifestId,rootId:root.root_id,qualificationId:q.qualification_id,payload:Buffer.from(payload),payloadSha256:sha256(payload)});
}

const ROOT_REAL=fs.realpathSync.native(ROOT);
function outsideRepo(raw,label){
  const target=path.resolve(String(raw||""));
  const parent=path.dirname(target);
  let st;
  try{st=fs.lstatSync(parent);}catch{fail(`${label} parent must already exist`);}
  if(st.isSymbolicLink()||!st.isDirectory()) fail(`${label} parent must be a real directory`);
  const realParent=fs.realpathSync.native(parent);
  if(realParent!==parent) fail(`${label} parent must be canonical and symlink-free`);
  const canonicalTarget=path.join(realParent,path.basename(target));
  const rel=path.relative(ROOT_REAL,canonicalTarget);
  if(rel===""||(rel!==".."&&!rel.startsWith(`..${path.sep}`)&&!path.isAbsolute(rel))) fail(`${label} must resolve outside repository`);
  return canonicalTarget;
}
function writeExclusive(file,bytes){fs.writeFileSync(file,bytes,{flag:"wx",mode:0o600});fs.chmodSync(file,0o600);}
function args(argv){const out={validityMinutes:90};for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith("--")||value===undefined)fail("invalid arguments");out[key.slice(2).replace(/-([a-z])/gu,(_m,c)=>c.toUpperCase())]=value;}return out;}

async function main(){
  const o=args(process.argv.slice(2));
  for(const key of ["receipt","expectedSourceSha","manifestOutput","payloadOutput"]) if(!o[key]) fail(`missing ${key}`);
  const root=loadTorBootstrapReleaseRootFile(ROOT_FILE,{allowHold:false});
  const predecessor=classifyTorBootstrapSignedManifestLifecycle(readJson(PREDECESSOR_FILE,"predecessor"),root);
  const built=buildTorBootstrapManifestCandidateV1({receipt:readJson(o.receipt,"qualification"),expectedSourceSha:o.expectedSourceSha,validatedRoot:root,predecessor,validityMinutes:Number(o.validityMinutes)});
  const manifestFile=outsideRepo(o.manifestOutput,"manifest output"),payloadFile=outsideRepo(o.payloadOutput,"payload output");
  if(manifestFile===payloadFile||fs.existsSync(manifestFile)||fs.existsSync(payloadFile)) fail("candidate output already exists or collides");
  let first=false;
  try{writeExclusive(manifestFile,Buffer.from(`${JSON.stringify(built.manifest,null,2)}\n`));first=true;writeExclusive(payloadFile,built.payload);}catch(error){if(first)fs.rmSync(manifestFile,{force:true});fs.rmSync(payloadFile,{force:true});throw error;}
  console.log(`${VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1}_GREEN`);
  console.log(`manifest_id=${built.manifestId}`);console.log(`release_root_id=${built.rootId}`);console.log(`qualification_id=${built.qualificationId}`);console.log(`signing_payload_sha256=${built.payloadSha256}`);
  console.log("signing_performed=false");console.log("private_key_access=false");console.log("repository_publication=false");
}
const invoked=process.argv[1]?pathToFileURL(fs.realpathSync(process.argv[1])).href:"";
if(import.meta.url===invoked)main().catch(error=>{console.error(`${VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1}_FAIL: ${error?.stack||error}`);process.exit(1);});
