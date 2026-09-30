#!/usr/bin/env node

import {
  createHash,
  createPublicKey,
  sign as cryptoSign,
  timingSafeEqual,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  unsignedVoidNodePublicOriginBindingBytesV1,
  voidNodePublicOriginBindingSha256V1,
  verifyVoidNodePublicOriginBindingV1,
} from "./lib/void-node-public-origin-binding-v1.mjs";
import {
  verifyReviewedVoidNodePublicOriginBindingV1,
} from "./lib/void-public-node-identity-trust-v1.mjs";
import {
  loadExistingVoidNodeKeypairV1,
} from "./lib/void-node-onion-binding-v1.mjs";
import {
  verifyVoidNodePublicOriginBindingSigningRequestV1,
} from "./void-node-public-origin-binding-signing-request-v1.mjs";

export const VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_EXECUTION_V1 =
  "VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_EXECUTION_V1";

export const VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_EXECUTION_AUTHORITY_V1 =
  Object.freeze({
    manual_execution_only: true,
    exact_request_required: true,
    exact_confirmation_required: true,
    existing_void_node_key_required: true,
    one_signature_created: true,
    create_only_output: true,
    publication: false,
    route_activation: false,
    service_restart: false,
    node_runtime_mutation: false,
    work_credit_mutation: false,
    transaction_submission: false,
    validator_mutation: false,
    payment_authority: false,
    funds_movement: false,
  });

const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(HERE,"..");
const KEYPAIR_MODULE=resolve(ROOT,"src/crypto/keypair.js");
const MAX_REQUEST_BYTES=512*1024;
const SIGNING_REQUEST_CLOCK_SKEW_MS=2*60*1000;
const SIGNING_REQUEST_MAX_VALIDITY_MS=366*24*60*60*1000;

function fail(message){
  throw new Error(message);
}

function sha256(value){
  return createHash("sha256").update(value).digest("hex");
}

function strictBase64(value,label){
  if(
    typeof value!=="string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)
  ){
    fail(`${label} must be canonical base64`);
  }
  const bytes=Buffer.from(value,"base64");
  if(bytes.toString("base64")!==value){
    fail(`${label} must be canonical base64`);
  }
  return bytes;
}

function canonicalExistingPath(value,label){
  if(typeof value!=="string" || !path.isAbsolute(value)){
    fail(`${label} must be an absolute path`);
  }
  let real;
  try{
    real=fs.realpathSync.native(value);
  }catch(error){
    fail(`${label} could not be canonicalized: ${error.message}`);
  }
  if(real!==value){
    fail(`${label} must not traverse symlinks or path aliases`);
  }
  return real;
}

function readRequestFile(file){
  const canonical=canonicalExistingPath(file,"request file");
  const flags=fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0);
  const fd=fs.openSync(canonical,flags);
  try{
    const before=fs.fstatSync(fd,{bigint:true});
    if(!before.isFile()) fail("request file must be a regular file");
    if(before.size<2n || before.size>BigInt(MAX_REQUEST_BYTES)){
      fail("request file size is invalid");
    }
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    if(
      before.dev!==after.dev ||
      before.ino!==after.ino ||
      before.size!==after.size ||
      before.mtimeNs!==after.mtimeNs ||
      before.ctimeNs!==after.ctimeNs ||
      BigInt(bytes.length)!==before.size
    ){
      fail("request file changed during read");
    }
    let text;
    try{
      text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    }catch{
      fail("request file is not valid UTF-8");
    }
    try{
      return JSON.parse(text);
    }catch{
      fail("request file is not valid JSON");
    }
  }finally{
    fs.closeSync(fd);
  }
}

function assertPrivateKeyFile(file){
  const canonical=canonicalExistingPath(file,"node private-key file");
  const stat=fs.lstatSync(canonical,{bigint:true});
  if(!stat.isFile() || stat.isSymbolicLink()){
    fail("node private-key file must be a regular non-symlink file");
  }
  if(typeof process.getuid==="function" && stat.uid!==BigInt(process.getuid())){
    fail("node private-key file must be owned by the current user");
  }
  if((Number(stat.mode)&0o077)!==0){
    fail("node private-key file must not grant group or world permissions");
  }
  if(stat.size<1n || stat.size>256n*1024n){
    fail("node private-key file size is invalid");
  }
  return {canonical,stat};
}

function assertUnchangedFile(file,before,label){
  const after=fs.lstatSync(file,{bigint:true});
  if(
    before.dev!==after.dev ||
    before.ino!==after.ino ||
    before.size!==after.size ||
    before.mtimeNs!==after.mtimeNs ||
    before.ctimeNs!==after.ctimeNs
  ){
    fail(`${label} changed during use`);
  }
}

function preflightOutputPath(file){
  if(typeof file!=="string" || !path.isAbsolute(file)){
    fail("output file must be an absolute path");
  }
  if(path.resolve(file)!==file){
    fail("output file path must already be canonical");
  }
  const parent=path.dirname(file);
  const realParent=fs.realpathSync.native(parent);
  if(realParent!==parent){
    fail("output parent must not traverse symlinks or path aliases");
  }
  try{
    fs.lstatSync(file);
    fail("refusing to overwrite existing output");
  }catch(error){
    if(error?.message==="refusing to overwrite existing output") throw error;
    if(error?.code!=="ENOENT") throw error;
  }
  return file;
}

function writeCreateOnlyPrivateJson(file,value){
  const flags=
    fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    Number(fs.constants.O_NOFOLLOW||0);
  const fd=fs.openSync(file,flags,0o600);
  try{
    const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd,0o600);
    return {
      bytes,
      artifact_sha256:sha256(bytes),
    };
  }finally{
    fs.closeSync(fd);
  }
}

function publicKeyFingerprint(publicKey){
  return sha256(
    publicKey.export({type:"spki",format:"der"}),
  );
}

export function assertVoidNodePublicOriginBindingSigningRequestActiveV1(
  request,
  nowMs=Date.now(),
){
  if(!Number.isFinite(nowMs)){
    fail("signing request verification time is invalid");
  }
  const issuedAt=String(
    request?.unsigned_binding?.issued_at||"",
  );
  const expiresAt=String(
    request?.unsigned_binding?.expires_at||"",
  );
  const issuedMs=Date.parse(issuedAt);
  const expiresMs=Date.parse(expiresAt);
  if(
    !Number.isFinite(issuedMs) ||
    !Number.isFinite(expiresMs) ||
    new Date(issuedMs).toISOString()!==issuedAt ||
    new Date(expiresMs).toISOString()!==expiresAt ||
    expiresMs<=issuedMs ||
    expiresMs-issuedMs>SIGNING_REQUEST_MAX_VALIDITY_MS
  ){
    fail("signing request binding validity is invalid");
  }
  if(issuedMs>nowMs+SIGNING_REQUEST_CLOCK_SKEW_MS){
    fail("signing request binding is not yet valid");
  }
  if(expiresMs<=nowMs){
    fail("signing request binding is expired");
  }
  return Object.freeze({
    issued_at:issuedAt,
    expires_at:expiresAt,
  });
}

export function requiredVoidNodePublicOriginBindingSigningConfirmationV1(
  request,
){
  return (
    "sign-void-node-public-origin-binding-v1:"+
    request.request_id+":"+
    request.signing.payload_sha256
  );
}

export function signVerifiedVoidNodePublicOriginBindingRequestV1({
  request,
  verifiedRequest,
  keypair,
  verifySignedBinding,
  nowMs,
}={}){
  if(!request || typeof request!=="object"){
    fail("verified request object is required");
  }
  if(!verifiedRequest || typeof verifiedRequest!=="object"){
    fail("verified request summary is required");
  }
  if(
    !keypair ||
    keypair.privateKey?.type!=="private" ||
    keypair.privateKey?.asymmetricKeyType!=="ed25519" ||
    keypair.publicKey?.type!=="public" ||
    keypair.publicKey?.asymmetricKeyType!=="ed25519"
  ){
    fail("existing VOID Ed25519 keypair is required");
  }
  if(typeof verifySignedBinding!=="function"){
    fail("signed binding verifier is required");
  }

  const payload=strictBase64(
    request.signing?.payload_base64,
    "request signing payload",
  );
  const payloadSha=sha256(payload);
  if(
    payloadSha!==request.signing?.payload_sha256 ||
    payloadSha!==verifiedRequest.payload_sha256
  ){
    fail("request signing payload SHA mismatch");
  }
  const derivedPayload=
    unsignedVoidNodePublicOriginBindingBytesV1(
      request.unsigned_binding,
    );
  if(
    derivedPayload.length!==payload.length ||
    !timingSafeEqual(derivedPayload,payload)
  ){
    fail("request signing payload bytes mismatch");
  }

  const canonicalPem=keypair.publicKey
    .export({type:"spki",format:"pem"})
    .toString();
  const fingerprint=publicKeyFingerprint(keypair.publicKey);
  const derivedPublic=createPublicKey(keypair.privateKey)
    .export({type:"spki",format:"der"});
  const suppliedPublic=keypair.publicKey
    .export({type:"spki",format:"der"});
  if(
    derivedPublic.length!==suppliedPublic.length ||
    !timingSafeEqual(derivedPublic,suppliedPublic)
  ){
    fail("existing VOID private/public key mismatch");
  }

  if(
    keypair.nodeId!==verifiedRequest.node_id ||
    request.unsigned_binding?.node?.node_id!==verifiedRequest.node_id
  ){
    fail("existing VOID node ID does not match signing request");
  }
  if(
    canonicalPem!==request.unsigned_binding?.node?.public_key_pem ||
    fingerprint!==verifiedRequest.public_key_fingerprint_sha256 ||
    fingerprint!==request.unsigned_binding?.node?.public_key_fingerprint_sha256
  ){
    fail("existing VOID public key does not match signing request");
  }

  const signingNowMs=
    nowMs===undefined ? Date.now() : nowMs;
  assertVoidNodePublicOriginBindingSigningRequestActiveV1(
    request,
    signingNowMs,
  );

  const signature=cryptoSign(null,payload,keypair.privateKey);
  if(signature.length!==64){
    fail("Ed25519 signature must contain 64 bytes");
  }
  const signed=structuredClone(request.unsigned_binding);
  signed.signature.value=signature.toString("base64");

  const verifiedSigned=verifySignedBinding(signed,{
    expectedOrigin:verifiedRequest.origin,
    expectedNodeId:verifiedRequest.node_id,
    nowMs:signingNowMs,
  });
  if(
    verifiedSigned?.origin!==verifiedRequest.origin ||
    verifiedSigned?.node_id!==verifiedRequest.node_id ||
    verifiedSigned?.public_key_fingerprint_sha256!==fingerprint
  ){
    fail("signed binding verification returned mismatched identity");
  }

  return Object.freeze({
    signed_binding:signed,
    summary:Object.freeze({
      request_id:request.request_id,
      origin:verifiedRequest.origin,
      node_id:verifiedRequest.node_id,
      public_key_fingerprint_sha256:fingerprint,
      payload_sha256:payloadSha,
      binding_sha256:voidNodePublicOriginBindingSha256V1(signed),
      expires_at:verifiedSigned.expires_at,
      signature_created:true,
      signature_count:1,
      publication:false,
      route_activation:false,
      service_restart:false,
      runtime_mutation:false,
      work_credit_mutation:false,
      funds_movement:false,
    }),
  });
}

export async function executeVoidNodePublicOriginBindingSigningV1({
  requestFile,
  keyFile,
  outputFile,
  confirmation,
}={}){
  const request=readRequestFile(requestFile);
  const verifiedRequest=
    verifyVoidNodePublicOriginBindingSigningRequestV1(request);
  const preKeyNowMs=Date.now();
  assertVoidNodePublicOriginBindingSigningRequestActiveV1(
    request,
    preKeyNowMs,
  );

  const requiredConfirmation=
    requiredVoidNodePublicOriginBindingSigningConfirmationV1(
      request,
    );
  if(confirmation!==requiredConfirmation){
    fail("exact signing confirmation mismatch");
  }

  preflightOutputPath(outputFile);
  const keyState=assertPrivateKeyFile(keyFile);
  const keypair=await loadExistingVoidNodeKeypairV1(
    KEYPAIR_MODULE,
    keyState.canonical,
  );
  assertUnchangedFile(
    keyState.canonical,
    keyState.stat,
    "node private-key file",
  );

  const completed=
    signVerifiedVoidNodePublicOriginBindingRequestV1({
      request,
      verifiedRequest,
      keypair,
      verifySignedBinding:
        verifyReviewedVoidNodePublicOriginBindingV1,
    });

  const written=writeCreateOnlyPrivateJson(
    outputFile,
    completed.signed_binding,
  );

  return Object.freeze({
    marker:
      VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_EXECUTION_V1,
    ...completed.summary,
    artifact_sha256:written.artifact_sha256,
    private_key_access_performed:true,
    private_key_disclosed:false,
    output_mode:"0600",
  });
}

function parseArgs(argv){
  const options={
    command:argv[0]||"",
    requestFile:"",
    keyFile:"",
    outputFile:"",
    confirmation:"",
  };
  for(let index=1;index<argv.length;index+=1){
    const arg=argv[index];
    const next=()=>{
      index+=1;
      if(index>=argv.length) fail(`missing value for ${arg}`);
      return argv[index];
    };
    if(arg==="--request") options.requestFile=next();
    else if(arg==="--key-file") options.keyFile=next();
    else if(arg==="--output") options.outputFile=next();
    else if(arg==="--confirmation") options.confirmation=next();
    else fail(`unknown argument: ${arg}`);
  }
  return options;
}

function usage(){
  console.log(
    "usage: node tools/void-node-public-origin-binding-signing-execution-v1.mjs sign "+
    "--request /absolute/request.json --key-file /absolute/node-key "+
    "--output /absolute/signed-binding.json "+
    "--confirmation sign-void-node-public-origin-binding-v1:<request_id>:<payload_sha256>",
  );
}

const direct=process.argv[1] &&
  import.meta.url===new URL(`file://${process.argv[1]}`).href;
if(direct){
  try{
    const options=parseArgs(process.argv.slice(2));
    if(options.command==="help" || options.command==="--help" || options.command==="-h"){
      usage();
    }else if(options.command==="sign"){
      if(
        !options.requestFile ||
        !options.keyFile ||
        !options.outputFile ||
        !options.confirmation
      ){
        fail("sign requires --request, --key-file, --output, and --confirmation");
      }
      const result=await executeVoidNodePublicOriginBindingSigningV1({
        requestFile:options.requestFile,
        keyFile:options.keyFile,
        outputFile:options.outputFile,
        confirmation:options.confirmation,
      });
      console.log(result.marker);
      console.log(`request_id=${result.request_id}`);
      console.log(`origin=${result.origin}`);
      console.log(`node_id=${result.node_id}`);
      console.log(`payload_sha256=${result.payload_sha256}`);
      console.log(`binding_sha256=${result.binding_sha256}`);
      console.log(`artifact_sha256=${result.artifact_sha256}`);
      console.log(`expires_at=${result.expires_at}`);
      console.log("signature_created=true");
      console.log("signature_count=1");
      console.log("private_key_access_performed=true");
      console.log("private_key_disclosed=false");
      console.log("publication=false");
      console.log("route_activation=false");
      console.log("service_restart=false");
      console.log("runtime_mutation=false");
      console.log("work_credit_mutation=false");
      console.log("funds_movement=false");
    }else{
      usage();
      fail("unknown command");
    }
  }catch(error){
    console.error("VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_EXECUTION_V1_HOLD");
    console.error(error instanceof Error?error.message:String(error));
    process.exitCode=1;
  }
}
