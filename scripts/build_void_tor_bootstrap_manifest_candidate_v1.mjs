#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildTorQualificationReceiptV1 } from "./qualify_void_public_seed_tor_v1.mjs";
import {
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

export function buildTorBootstrapManifestCandidateV1({receipt,expectedSourceSha,validatedRoot,predecessor,nowMs=Date.now(),validityMinutes=72*60}={}){
  const q=validateTorQualificationReceiptForManifestV1(receipt,{expectedSourceSha,nowMs});
  const rootValidation=validateTorBootstrapReleaseRoot(validatedRoot?.root||validatedRoot,{allowHold:false});
  const root=rootValidation.root;
  if(!predecessor||!["active","authenticated_stale"].includes(predecessor.lifecycle)||predecessor.root?.root_id!==root.root_id||predecessor.validSignatureCount<root.threshold) fail("authenticated predecessor required");
  const old=predecessor.manifest?.onion_endpoints;
  const base=`http://${q.transport.onion_hostname}`;
  if(!Array.isArray(old)||old.length!==1||old[0]?.enabled!==true||old[0]?.base!==base) fail("canonical Tor onion identity changed");
  const minutes=Number(validityMinutes);
  if(!Number.isSafeInteger(minutes)||minutes<60||minutes>7*24*60) fail("validity minutes must be 60 through 10080");
  const expiresMs=nowMs+minutes*60_000;
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
function outsideRepo(raw,label,fsImpl=fs){
  const target=path.resolve(String(raw||""));
  const parent=path.dirname(target);
  let st;
  try{st=fsImpl.lstatSync(parent);}catch{fail(`${label} parent must already exist`);}
  if(st.isSymbolicLink()||!st.isDirectory()) fail(`${label} parent must be a real directory`);
  const realParent=fsImpl.realpathSync.native(parent);
  if(realParent!==parent) fail(`${label} parent must be canonical and symlink-free`);
  const canonicalTarget=path.join(realParent,path.basename(target));
  const rel=path.relative(ROOT_REAL,canonicalTarget);
  if(rel===""||(rel!==".."&&!rel.startsWith(`..${path.sep}`)&&!path.isAbsolute(rel))) fail(`${label} must resolve outside repository`);
  return canonicalTarget;
}
function parentIdentity(st){
 return Object.freeze({dev:st.dev,ino:st.ino,uid:st.uid,gid:st.gid,mode:st.mode,nlink:st.nlink});
}
function sameParentIdentity(st,expected){
 return !st.isSymbolicLink()&&st.isDirectory()&&st.dev===expected.dev&&st.ino===expected.ino&&
   st.uid===expected.uid&&st.gid===expected.gid&&st.mode===expected.mode&&st.nlink===expected.nlink;
}
export function bindOutputTargetV1(file,label="candidate output",fsImpl=fs){
 if(process.platform!=="linux")fail("candidate output descriptor-relative custody requires Linux");
 const canonical=outsideRepo(file,label,fsImpl);
 const parent=path.dirname(canonical),basename=path.basename(canonical);
 const directoryFlag=fs.constants.O_DIRECTORY,noFollow=fs.constants.O_NOFOLLOW;
 if(typeof directoryFlag!=="number"||typeof noFollow!=="number")fail("candidate output descriptor flags unavailable");
 const before=fsImpl.lstatSync(parent);
 let parentFd=null;
 try{
  parentFd=fsImpl.openSync(parent,fs.constants.O_RDONLY|directoryFlag|noFollow);
  const opened=fsImpl.fstatSync(parentFd),visible=fsImpl.lstatSync(parent);
  const identity=parentIdentity(opened);
  if(!sameParentIdentity(opened,parentIdentity(before))||
     !sameParentIdentity(visible,identity)||
     fsImpl.realpathSync.native(parent)!==parent)fail("candidate output parent identity drift");
  const procParent=`/proc/self/fd/${parentFd}`;
  if(fsImpl.realpathSync.native(procParent)!==parent)fail("candidate output parent descriptor mismatch");
  return Object.freeze({file:canonical,parent,basename,parentFd,parentIdentity:identity,fdFile:path.join(procParent,basename)});
 }catch(error){
  if(parentFd!==null){try{fsImpl.closeSync(parentFd);}catch(cleanupError){void cleanupError;}}
  throw error;
 }
}
function assertBoundParentStableV1(bound,fsImpl=fs){
 const opened=fsImpl.fstatSync(bound.parentFd);
 let visible;
 try{visible=fsImpl.lstatSync(bound.parent);}catch{fail("candidate output parent identity drift");}
 if(!sameParentIdentity(opened,bound.parentIdentity)||
    !sameParentIdentity(visible,bound.parentIdentity)||
    fsImpl.realpathSync.native(bound.parent)!==bound.parent)fail("candidate output parent identity drift");
}
function closeBoundOutputV1(bound,fsImpl=fs){
 if(!bound)return;
 try{fsImpl.closeSync(bound.parentFd);}catch(cleanupError){void cleanupError;}
}
function ownedIdentity(bound,st){
 return Object.freeze({file:bound.file,parent:bound.parent,parentDev:bound.parentIdentity.dev,parentIno:bound.parentIdentity.ino,dev:st.dev,ino:st.ino});
}
function sameOwnedIdentity(st,owned){return !st.isSymbolicLink()&&st.dev===owned.dev&&st.ino===owned.ino;}
function removeOwnedBoundOutputV1(bound,owned,fsImpl=fs){
 if(!owned)return false;
 let visible;
 try{visible=fsImpl.lstatSync(bound.fdFile);}catch(error){if(error?.code==="ENOENT")return false;throw error;}
 if(!sameOwnedIdentity(visible,owned))return false;
 fsImpl.rmSync(bound.fdFile,{force:false});
 return true;
}
export function removeOwnedOutputV1(owned,fsImpl=fs){
 if(!owned)return false;
 let bound;
 try{bound=bindOutputTargetV1(owned.file,"candidate cleanup",fsImpl);}catch{return false;}
 try{
  if(bound.parentIdentity.dev!==owned.parentDev||bound.parentIdentity.ino!==owned.parentIno)return false;
  return removeOwnedBoundOutputV1(bound,owned,fsImpl);
 }finally{closeBoundOutputV1(bound,fsImpl);}
}
function createBoundOutputV1(bound,bytes,fsImpl=fs){
 let fd=null,owned=null;
 try{
  assertBoundParentStableV1(bound,fsImpl);
  fd=fsImpl.openSync(bound.fdFile,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
  owned=ownedIdentity(bound,fsImpl.fstatSync(fd));
  fsImpl.fchmodSync(fd,0o600);fsImpl.writeFileSync(fd,bytes);fsImpl.fsyncSync(fd);
  assertBoundParentStableV1(bound,fsImpl);
  const visible=fsImpl.lstatSync(bound.fdFile);
  if(!sameOwnedIdentity(visible,owned))fail("candidate output identity drift");
  fsImpl.closeSync(fd);fd=null;
  return owned;
 }catch(error){
  if(fd!==null){try{fsImpl.closeSync(fd);}catch(cleanupError){void cleanupError;}}
  if(owned){try{removeOwnedBoundOutputV1(bound,owned,fsImpl);}catch(cleanupError){void cleanupError;}}
  if(!owned&&error?.code==="EEXIST")fail("candidate output already exists: "+bound.file);
  throw error;
 }
}
export function writeExclusiveOwnedV1(file,bytes,fsImpl=fs){
 const bound=bindOutputTargetV1(file,"candidate output",fsImpl);
 try{return createBoundOutputV1(bound,bytes,fsImpl);}
 finally{closeBoundOutputV1(bound,fsImpl);}
}
export function writeCandidateOutputsV1({manifestFile,manifestBytes,payloadFile,payloadBytes,fsImpl=fs}={}){
 let manifestBound=null,payloadBound=null;const owned=[];
 try{
  manifestBound=bindOutputTargetV1(manifestFile,"manifest output",fsImpl);
  payloadBound=bindOutputTargetV1(payloadFile,"payload output",fsImpl);
  if(manifestBound.file===payloadBound.file)fail("candidate output collides");
  owned.push(createBoundOutputV1(manifestBound,manifestBytes,fsImpl));
  owned.push(createBoundOutputV1(payloadBound,payloadBytes,fsImpl));
  assertBoundParentStableV1(manifestBound,fsImpl);assertBoundParentStableV1(payloadBound,fsImpl);
  return Object.freeze({manifest:owned[0],payload:owned[1]});
 }catch(error){
  if(payloadBound&&owned[1]){try{removeOwnedBoundOutputV1(payloadBound,owned[1],fsImpl);}catch(cleanupError){void cleanupError;}}
  if(manifestBound&&owned[0]){try{removeOwnedBoundOutputV1(manifestBound,owned[0],fsImpl);}catch(cleanupError){void cleanupError;}}
  throw error;
 }finally{closeBoundOutputV1(payloadBound,fsImpl);closeBoundOutputV1(manifestBound,fsImpl);}
}
function args(argv){const out={validityMinutes:72*60};for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith("--")||value===undefined)fail("invalid arguments");out[key.slice(2).replace(/-([a-z])/gu,(_m,c)=>c.toUpperCase())]=value;}return out;}

async function main(){
  const o=args(process.argv.slice(2));
  for(const key of ["receipt","expectedSourceSha","manifestOutput","payloadOutput"]) if(!o[key]) fail(`missing ${key}`);
  const root=loadTorBootstrapReleaseRootFile(ROOT_FILE,{allowHold:false});
  const predecessor=classifyTorBootstrapSignedManifestLifecycle(readJson(PREDECESSOR_FILE,"predecessor"),root);
  const built=buildTorBootstrapManifestCandidateV1({receipt:readJson(o.receipt,"qualification"),expectedSourceSha:o.expectedSourceSha,validatedRoot:root,predecessor,validityMinutes:Number(o.validityMinutes)});
  const manifestFile=outsideRepo(o.manifestOutput,"manifest output"),payloadFile=outsideRepo(o.payloadOutput,"payload output");
  writeCandidateOutputsV1({
    manifestFile,
    manifestBytes:Buffer.from(`${JSON.stringify(built.manifest,null,2)}\n`),
    payloadFile,
    payloadBytes:built.payload,
  });
  console.log(`${VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1}_GREEN`);
  console.log(`manifest_id=${built.manifestId}`);console.log(`release_root_id=${built.rootId}`);console.log(`qualification_id=${built.qualificationId}`);console.log(`signing_payload_sha256=${built.payloadSha256}`);
  console.log("signing_performed=false");console.log("private_key_access=false");console.log("repository_publication=false");
}
const invoked=process.argv[1]?pathToFileURL(fs.realpathSync(process.argv[1])).href:"";
if(import.meta.url===invoked)main().catch(error=>{console.error(`${VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1}_FAIL: ${error?.stack||error}`);process.exit(1);});
