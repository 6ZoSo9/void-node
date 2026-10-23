#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_V3 =
  "VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_V3";

export const VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_AUTHORITY_V3 =
  Object.freeze({
    production_launcher_source:true,
    current_stack_versioned_launcher:true,
    historical_v1_semantics_preserved:true,
    historical_v2_semantics_preserved:true,
    graceful_signal_shutdown_settled:true,
    exact_dependency_blob_verification_before_import:true,
    root_owned_immutable_release_required:true,
    public_operator_key_only:true,
    af_unix_service_only:true,
    automatic_retry:false,
    stale_socket_cleanup_performed:false,
    operator_private_key_access:false,
    production_signing:false,
    attempt_claim:false,
    training_execution:false,
    candidate_weight_mutation:false,
    generation_execution:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
    external_network_access:false,
  });

const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const SERVICE=path.join(ROOT,"tools/apollyon-authorization-custody-service-v1.mjs");
const CORE=path.join(ROOT,"tools/apollyon-authorization-custody-core-v1.mjs");
const VERIFIER=path.join(ROOT,"scripts/apollyon_operator_authorization_packet_v1.mjs");
const SERVICE_BLOB_SHA1="8961572ba5834371b1229f790a1960940fc74935";
const CORE_BLOB_SHA1="f9f18db5bbfeea466202ef0d7babe08c3c401d66";
const VERIFIER_BLOB_SHA1="c224ebc4fcb332b70e83900a8e086e0257f31670";
const HASH64=/^[0-9a-f]{64}$/u;
const ED25519_SPKI_PREFIX=Buffer.from("302a300506032b6570032100","hex");

function fail(code){ throw new Error(code); }
function sha256(value){ return crypto.createHash("sha256").update(value).digest("hex"); }
function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`,"ascii"))
    .update(bytes)
    .digest("hex");
}
function canonicalAbs(value,code){
  if(typeof value!=="string"||!path.isAbsolute(value)||path.resolve(value)!==value||value.includes("\0")) fail(code);
  return value;
}
function assertNoSymlinkAncestors(target,code){
  const parsed=path.parse(target);
  let cursor=parsed.root;
  for(const segment of target.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    if(fs.lstatSync(cursor).isSymbolicLink()) fail(code);
  }
}
function assertRootOwnedProtectedAncestors(target,code){
  const parsed=path.parse(target);
  let cursor=parsed.root;
  const parent=path.dirname(target);
  for(const segment of parent.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const metadata=fs.lstatSync(cursor,{bigint:true});
    if(
      !metadata.isDirectory()||metadata.isSymbolicLink()||metadata.uid!==0n||
      Number(metadata.mode&0o022n)!==0
    )fail(code);
  }
}
function assertRootOwnedImmutableFile(file,expectedBlob,code){
  const canonical=canonicalAbs(file,code);
  assertNoSymlinkAncestors(canonical,code);
  assertRootOwnedProtectedAncestors(canonical,code);
  if(fs.realpathSync.native(canonical)!==canonical) fail(code);
  const before=fs.lstatSync(canonical,{bigint:true});
  if(
    !before.isFile()||before.isSymbolicLink()||before.uid!==0n||
    Number(before.mode&0o022n)!==0||before.nlink!==1n||before.size<1n||before.size>1024n*1024n
  ) fail(code);
  const fd=fs.openSync(canonical,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    if(
      opened.dev!==before.dev||opened.ino!==before.ino||opened.uid!==before.uid||
      opened.gid!==before.gid||opened.mode!==before.mode||opened.nlink!==before.nlink||
      opened.size!==before.size
    ) fail(code);
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(canonical,{bigint:true});
    if(
      after.dev!==opened.dev||after.ino!==opened.ino||after.size!==opened.size||
      after.mtimeNs!==opened.mtimeNs||after.ctimeNs!==opened.ctimeNs||
      visible.dev!==after.dev||visible.ino!==after.ino||visible.size!==after.size||
      visible.mtimeNs!==after.mtimeNs||visible.ctimeNs!==after.ctimeNs
    ) fail(code);
    if(gitBlobSha1(bytes)!==expectedBlob) fail(code);
  }finally{ fs.closeSync(fd); }
}
function readPublicKey(file,expectedFingerprint){
  const canonical=canonicalAbs(file,"apollyon_custody_launcher_public_key_path_invalid");
  assertNoSymlinkAncestors(canonical,"apollyon_custody_launcher_public_key_path_invalid");
  if(fs.realpathSync.native(canonical)!==canonical) fail("apollyon_custody_launcher_public_key_path_invalid");
  const before=fs.lstatSync(canonical,{bigint:true});
  const uid=typeof process.getuid==="function"?BigInt(process.getuid()):before.uid;
  if(
    !before.isFile()||before.isSymbolicLink()||
    (before.uid!==0n&&before.uid!==uid)||
    Number(before.mode&0o022n)!==0||before.nlink!==1n||before.size<32n||before.size>8192n
  ) fail("apollyon_custody_launcher_public_key_metadata_invalid");
  const fd=fs.openSync(canonical,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  let bytes;
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    if(opened.dev!==before.dev||opened.ino!==before.ino||opened.size!==before.size) fail("apollyon_custody_launcher_public_key_identity_invalid");
    bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    if(after.dev!==opened.dev||after.ino!==opened.ino||after.size!==opened.size||after.mtimeNs!==opened.mtimeNs||after.ctimeNs!==opened.ctimeNs) fail("apollyon_custody_launcher_public_key_changed");
  }finally{ fs.closeSync(fd); }
  let key;
  try{ key=crypto.createPublicKey(bytes); }
  catch{ fail("apollyon_custody_launcher_public_key_invalid"); }
  if(key.asymmetricKeyType!=="ed25519") fail("apollyon_custody_launcher_public_key_type_invalid");
  const der=key.export({type:"spki",format:"der"});
  if(der.length!==44||!der.subarray(0,12).equals(ED25519_SPKI_PREFIX)) fail("apollyon_custody_launcher_public_key_spki_invalid");
  if(sha256(der.subarray(12))!==expectedFingerprint) fail("apollyon_custody_launcher_public_key_fingerprint_mismatch");
  return bytes.toString("utf8");
}
function parseCli(argv){
  if(argv.length!==10) fail("apollyon_custody_launcher_arguments_invalid");
  const out={};
  for(let i=0;i<argv.length;i+=2){
    const key=argv[i],value=argv[i+1];
    if(!key?.startsWith("--")||value===undefined) fail("apollyon_custody_launcher_arguments_invalid");
    const name=key.slice(2).replaceAll("-","_");
    if(Object.hasOwn(out,name)) fail("apollyon_custody_launcher_arguments_invalid");
    out[name]=value;
  }
  const expected=[
    "expected_operator_public_key_raw_sha256","operator_public_key_file",
    "socket_group_gid","socket_path","state_root",
  ];
  if(Object.keys(out).sort().join("\n")!==expected.sort().join("\n")) fail("apollyon_custody_launcher_arguments_invalid");
  if(!HASH64.test(out.expected_operator_public_key_raw_sha256)) fail("apollyon_custody_launcher_fingerprint_invalid");
  if(!/^(?:0|[1-9][0-9]*)$/u.test(out.socket_group_gid)) fail("apollyon_custody_launcher_socket_group_invalid");
  const gid=Number(out.socket_group_gid);
  if(!Number.isSafeInteger(gid)||gid<0||gid>0x7fff_ffff) fail("apollyon_custody_launcher_socket_group_invalid");
  return Object.freeze({
    socket_path:canonicalAbs(out.socket_path,"apollyon_custody_launcher_socket_path_invalid"),
    state_root:canonicalAbs(out.state_root,"apollyon_custody_launcher_state_root_invalid"),
    socket_group_gid:gid,
    expected_operator_public_key_raw_sha256:out.expected_operator_public_key_raw_sha256,
    operator_public_key_file:canonicalAbs(out.operator_public_key_file,"apollyon_custody_launcher_public_key_path_invalid"),
  });
}
export async function waitForApollyonAuthorizationCustodyShutdownV3(
  service,
  signalSource=process,
){
  if(!service||typeof service.stop!=="function"){
    fail("apollyon_custody_launcher_v3_shutdown_service_invalid");
  }
  if(
    !signalSource||
    typeof signalSource.on!=="function"||
    typeof signalSource.removeListener!=="function"
  ){
    fail("apollyon_custody_launcher_v3_shutdown_signal_source_invalid");
  }
  let finishing=false;
  let resolveDone;
  let rejectDone;
  const done=new Promise((resolve,reject)=>{
    resolveDone=resolve;
    rejectDone=reject;
  });
  const onSignal=()=>{
    if(finishing)return;
    finishing=true;
    Promise.resolve()
      .then(()=>service.stop())
      .then(resolveDone,rejectDone);
  };
  signalSource.on("SIGTERM",onSignal);
  signalSource.on("SIGINT",onSignal);
  try{
    await done;
  }finally{
    signalSource.removeListener("SIGTERM",onSignal);
    signalSource.removeListener("SIGINT",onSignal);
  }
}

async function main(){
  if(typeof process.getuid==="function"&&process.getuid()===0) fail("apollyon_custody_launcher_refuses_root_runtime");
  for(const name of ["NODE_OPTIONS","NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH"]){
    if(typeof process.env[name]==="string"&&process.env[name]!=="") fail("apollyon_custody_launcher_loader_environment_forbidden");
  }
  assertRootOwnedImmutableFile(SERVICE,SERVICE_BLOB_SHA1,"apollyon_custody_launcher_service_blob_invalid");
  assertRootOwnedImmutableFile(CORE,CORE_BLOB_SHA1,"apollyon_custody_launcher_core_blob_invalid");
  assertRootOwnedImmutableFile(VERIFIER,VERIFIER_BLOB_SHA1,"apollyon_custody_launcher_verifier_blob_invalid");
  const config=parseCli(process.argv.slice(2));
  const publicKeyPem=readPublicKey(
    config.operator_public_key_file,
    config.expected_operator_public_key_raw_sha256,
  );
  const module=await import(pathToFileURL(SERVICE).href);
  if(typeof module.createApollyonAuthorizationCustodyServiceV1!=="function") fail("apollyon_custody_launcher_service_export_missing");
  const service=module.createApollyonAuthorizationCustodyServiceV1({
    socket_path:config.socket_path,
    state_root:config.state_root,
    socket_group_gid:config.socket_group_gid,
    expected_operator_public_key_raw_sha256:config.expected_operator_public_key_raw_sha256,
    operator_public_key_pem:publicKeyPem,
  });
  await service.start();
  process.stdout.write(
    JSON.stringify({
      marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_V3,
      version:3,
      status:"custody_service_started",
      attempt_claimed:false,
      training_execution_performed:false,
    })+"\n",
  );
  await waitForApollyonAuthorizationCustodyShutdownV3(service);
  process.exitCode=0;
}

const directInvocation=(
  typeof process.argv[1]==="string"&&
  pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url
);
if(directInvocation){
  try{ await main(); }
  catch(error){
    process.stderr.write("HOLD="+String(error?.message||error)+"\n");
    process.stderr.write("operator_private_key_access=false\nproduction_signing=false\nattempt_claim=false\ntraining_execution=false\nfunds_movement=false\n");
    process.exitCode=2;
  }
}
