#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {computeAddress, SigningKey} from "ethers";

const MARKER="VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1";
const STATUS="PUBLIC_IDENTITY_DERIVATION_GREEN_UNBOUND";
const IMAGE="hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042";
const VERSION="26.8.1";
const NODE_ID=/^[0-9a-f]{32}$/;
const ROLE=/^[a-z0-9][a-z0-9-]{0,31}$/;
const HEX_KEY=/^[0-9a-f]{64}$/;
const MAX_HEALTH_BYTES=64*1024;

function fail(message){
  throw new Error(message);
}
function argValue(name){
  const i=process.argv.indexOf(name);
  return i>=0?process.argv[i+1]:undefined;
}
function normalizeNodeBase(raw){
  let u;
  try{u=new URL(String(raw||""));}catch{fail("node_base_invalid");}
  const host=u.hostname.replace(/^\[|\]$/g,"").toLowerCase();
  if(u.protocol!=="http:" || (host!=="127.0.0.1"&&host!=="::1") || u.username || u.password || u.search || u.hash){
    fail("node_base_must_be_loopback_http");
  }
  if(!u.port) fail("node_base_port_required");
  u.pathname="/";
  return u.toString();
}
function normalizeNodeId(value){
  const s=String(value??"").trim().toLowerCase().replace(/^0x/,"");
  if(!NODE_ID.test(s)) fail("health_node_id_invalid");
  return s;
}
function readHealth(base){
  return new Promise((resolve,reject)=>{
    const u=new URL("health",base);
    const req=http.request({
      protocol:"http:",
      hostname:u.hostname.replace(/^\[|\]$/g,""),
      port:Number(u.port),
      path:u.pathname,
      method:"GET",
      family:u.hostname.includes(":")?6:4,
      agent:false,
      headers:{Accept:"application/json",Connection:"close","User-Agent":"void-epoch2-qbft-identity-prepare-v1"},
    },(res)=>{
      const chunks=[];
      let total=0;
      res.on("data",(chunk)=>{
        const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
        total+=b.length;
        if(total>MAX_HEALTH_BYTES){
          req.destroy(new Error("health_response_too_large"));
          return;
        }
        chunks.push(b);
      });
      res.on("end",()=>{
        if(res.statusCode!==200) return reject(new Error("health_http_status_invalid"));
        try{
          const value=JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if(value?.ok!==true) return reject(new Error("health_not_ok"));
          resolve(value);
        }catch(error){reject(error);}
      });
    });
    req.setTimeout(5000,()=>req.destroy(new Error("health_timeout")));
    req.on("error",reject);
    req.end();
  });
}
function ensurePrivateDir(root){
  fs.mkdirSync(root,{recursive:true,mode:0o700});
  const st=fs.lstatSync(root);
  if(!st.isDirectory()||st.isSymbolicLink()) fail("private_root_invalid");
  fs.chmodSync(root,0o700);
}
function readOrCreateKey(keyPath){
  if(fs.existsSync(keyPath)){
    const st=fs.lstatSync(keyPath);
    if(!st.isFile()||st.isSymbolicLink()) fail("existing_key_not_regular");
    const mode=st.mode&0o777;
    if(mode!==0o600&&mode!==0o400) fail("existing_key_mode_invalid");
    const raw=fs.readFileSync(keyPath,"utf8").trim().toLowerCase().replace(/^0x/,"");
    if(!HEX_KEY.test(raw)) fail("existing_key_shape_invalid");
    return {key:raw,newKey:false};
  }
  for(let i=0;i<32;i+=1){
    const raw=crypto.randomBytes(32).toString("hex");
    try{
      new SigningKey("0x"+raw);
      fs.writeFileSync(keyPath,raw,{encoding:"utf8",mode:0o600,flag:"wx"});
      fs.chmodSync(keyPath,0o600);
      return {key:raw,newKey:true};
    }catch(error){
      if(i===31){
        fail("secp256k1_key_generation_failed:"+String(error?.name||"Error"));
      }
    }
  }
  fail("secp256k1_key_generation_failed");
}
function sha256Bytes(buf){
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function writeExclusiveJson(file,value,mode=0o600){
  const body=JSON.stringify(value,null,2)+"\n";
  fs.writeFileSync(file,body,{encoding:"utf8",mode,flag:"wx"});
  fs.chmodSync(file,mode);
  return {bytes:Buffer.byteLength(body),sha256:sha256Bytes(Buffer.from(body,"utf8"))};
}

const role=String(argValue("--machine-role")||"").trim().toLowerCase();
if(!ROLE.test(role)) fail("machine_role_invalid");

const nodeBase=normalizeNodeBase(argValue("--node-base"));
const output=path.resolve(String(argValue("--output")||""));
if(!output||output===path.parse(output).root) fail("output_invalid");

const privateRoot=path.resolve(
  String(
    argValue("--private-root")||
    path.join(os.homedir(),".local","share","void","epoch2-qbft-validator-identity-v1",role),
  ),
);
ensurePrivateDir(privateRoot);

const health=await readHealth(nodeBase);
const nodeId=normalizeNodeId(health.nodeId??health.node_id??health?.node?.id);

const keyPath=path.join(privateRoot,"nodekey");
const {key,newKey}=readOrCreateKey(keyPath);

let signingKey;
try{signingKey=new SigningKey("0x"+key);}catch{fail("secp256k1_key_invalid");}
const publicKey=signingKey.publicKey.toLowerCase();
const validatorAddress=computeAddress(publicKey).toLowerCase();
signingKey=null;

const repoHead=execFileSync("git",["rev-parse","HEAD"],{
  cwd:process.cwd(),encoding:"utf8",stdio:["ignore","pipe","ignore"],
}).trim();

const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
const localAttestationName=`void_epoch2_qbft_identity_${role}_v1_${stamp}.json`;
const localAttestationPath=path.join(privateRoot,localAttestationName);

const localAttestation={
  marker:"VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_LOCAL_PRIVATE_ATTESTATION_V1",
  version:1,
  created_at_utc:new Date().toISOString(),
  source_commit:repoHead,
  machine_role:role,
  hostname:os.hostname(),
  void_node_id:nodeId,
  node_base:nodeBase.replace(/\/$/,""),
  besu:{
    client:"Besu",
    client_version:VERSION,
    image:IMAGE,
    node_private_key_file_basename:"nodekey",
    node_private_key_file_mode:"600",
    node_private_key_unencrypted:true,
    key_created_this_run:newKey,
    public_key:publicKey,
    validator_address:validatorAddress,
    address_derivation_method:"ethers.SigningKey.publicKey + ethers.computeAddress",
    public_key_address_derivation_verified:
      computeAddress(publicKey).toLowerCase()===validatorAddress,
  },
  secrecy:{
    private_key_content_exported:false,
    private_key_content_recorded_in_attestation:false,
    private_key_content_recorded_in_repo:false,
    private_key_stdout:false,
  },
  authority:{
    besu_node_started:false,
    production_validator_set_bound:false,
    validator_mutation:false,
    authoritative_chain2050_write:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation:false,
  },
};
const localReceipt=writeExclusiveJson(localAttestationPath,localAttestation);

const publicAttestation={
  marker:MARKER,
  version:1,
  status:STATUS,
  source_commit:repoHead,
  machine_role:role,
  hostname:os.hostname(),
  void_node_id:nodeId,
  node_base:nodeBase.replace(/\/$/,""),
  besu:{
    client:"Besu",
    client_version:VERSION,
    image:IMAGE,
    public_key:publicKey,
    validator_address:validatorAddress,
    address_derivation_method:"ethers.SigningKey.publicKey + ethers.computeAddress",
    public_key_address_derivation_verified:
      computeAddress(publicKey).toLowerCase()===validatorAddress,
  },
  local_private_attestation:{
    filename:localAttestationName,
    file_sha256:localReceipt.sha256,
    private_key_content_exported:false,
    private_key_content_recorded_in_repo:false,
  },
  authority:{
    besu_node_started:false,
    production_validator_set_bound:false,
    validator_mutation:false,
    authoritative_chain2050_write:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation:false,
  },
};

const outDir=path.dirname(output);
fs.mkdirSync(outDir,{recursive:true});
if(fs.existsSync(output)) fail("output_already_exists");
const publicReceipt=writeExclusiveJson(output,publicAttestation);

key.fill?.(0);

console.log("VOID_ECONOMIC_EPOCH2_QBFT_LOCAL_IDENTITY_PREPARE_V1_GREEN");
console.log("machine_role="+role);
console.log("hostname="+os.hostname());
console.log("void_node_id="+nodeId);
console.log("besu_public_key="+publicKey);
console.log("besu_validator_address="+validatorAddress);
console.log("public_key_address_derivation_verified=true");
console.log("node_private_key_created="+newKey);
console.log("node_private_key_stdout=false");
console.log("node_private_key_repo_write=false");
console.log("local_private_attestation_sha256="+localReceipt.sha256);
console.log("public_attestation="+output);
console.log("public_attestation_sha256="+publicReceipt.sha256);
console.log("besu_node_started=false");
console.log("production_validator_set_bound=false");
console.log("validator_mutation=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
