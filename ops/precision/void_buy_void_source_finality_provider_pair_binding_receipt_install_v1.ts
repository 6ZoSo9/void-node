#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
  buyVoidSourceFinalityDeploymentReceiptIdV7,
  buyVoidSourceFinalityEnforcementLockIdV7,
  inspectBuyVoidSourceFinalityReviewedSourceFilesV7,
} from "../../src/economic/buy_void_source_finality_generation_provenance_v7.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_PATH_V1,
  buyVoidSourceFinalityProviderPairBindingReceiptIdV1,
} from "../../src/economic/buy_void_source_finality_provider_pair_binding_v1.js";

export const MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_RECEIPT_INSTALL_V1";
export const DEPLOYMENT_RECEIPT_PATH =
  "/var/lib/void-source-finality-v7/deployment-receipt.json";
export const APPLY_CONFIRMATION =
  "installBuyVoidSourceFinalityProviderPairReceiptV1";

const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const SHA40=/^[0-9a-f]{40}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const DEPLOYMENT_ID=/^voidbsfdep1_[0-9a-f]{64}$/u;
const ENFORCEMENT_LOCK_ID=/^voidbenfl1_[0-9a-f]{64}$/u;
const MAX_BYTES=64*1024;

type PairInput = Readonly<{
  base_primary_identity:string;
  base_primary_fingerprint_sha256:string;
  base_secondary_identity:string;
  base_secondary_fingerprint_sha256:string;
  ethereum_primary_identity:string;
  ethereum_primary_fingerprint_sha256:string;
  ethereum_secondary_identity:string;
  ethereum_secondary_fingerprint_sha256:string;
}>;

type DeploymentBinding = Readonly<{
  deployment_receipt_id:string;
  accepted_enforcement_set_sha256:string;
}>;

function plain(value:unknown):value is Record<string,unknown>{
  if(value===null||typeof value!=="object"||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function canonical(value:unknown):string{
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(plain(value))return "{"+Object.keys(value).sort()
    .map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
  throw Error("provider_pair_install_canonical_value_invalid");
}
function exactKeys(value:unknown,keys:string[],code:string):asserts value is Record<string,unknown>{
  assert.ok(plain(value),code);
  assert.deepEqual(Object.keys(value).sort(),[...keys].sort(),code);
}
function safeId(value:string,label:string):string{
  const normalized=String(value||"").trim();
  assert.match(normalized,SAFE_ID,label+"_invalid");
  return normalized;
}
function fingerprint(value:string,label:string):string{
  const normalized=String(value||"").trim().toLowerCase();
  assert.match(normalized,SHA256,label+"_invalid");
  return normalized;
}
function assertRootAncestors(absolute:string):void{
  let current=path.dirname(absolute);
  for(;;){
    const st=fs.lstatSync(current);
    assert.ok(st.isDirectory()&&!st.isSymbolicLink(),
      "provider_pair_install_ancestor_not_direct_directory:"+current);
    assert.equal(st.uid,0,"provider_pair_install_ancestor_not_root_owned:"+current);
    assert.equal(st.mode&0o022,0,
      "provider_pair_install_ancestor_group_or_world_writable:"+current);
    if(current==="/")break;
    const next=path.dirname(current);
    assert.notEqual(next,current,"provider_pair_install_ancestor_walk_stalled");
    current=next;
  }
}
function metadataSame(a:fs.Stats,b:fs.Stats):boolean{
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink&&a.size===b.size&&
    a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
}

export function readDeploymentBindingV1(absolutePath:string):DeploymentBinding{
  const absolute=path.resolve(absolutePath);
  assert.equal(absolute,absolutePath,"deployment_receipt_path_not_canonical");
  assert.ok(path.isAbsolute(absolute),"deployment_receipt_path_not_absolute");
  assertRootAncestors(absolute);
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink(),
    "deployment_receipt_not_regular");
  assert.equal(before.uid,0,"deployment_receipt_not_root_owned");
  assert.equal(before.gid,0,"deployment_receipt_not_root_group");
  assert.equal(before.nlink,1,"deployment_receipt_link_count_invalid");
  assert.equal(before.mode&0o7777,0o444,"deployment_receipt_mode_invalid");
  assert.ok(before.size>1&&before.size<=MAX_BYTES,"deployment_receipt_size_invalid");
  const fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  let bytes:Buffer;
  try{
    const opened=fs.fstatSync(fd);
    assert.ok(metadataSame(before,opened),"deployment_receipt_open_identity_mismatch");
    bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd);
    const visible=fs.lstatSync(absolute);
    assert.ok(metadataSame(opened,after)&&metadataSame(after,visible),
      "deployment_receipt_changed_during_read");
  }finally{fs.closeSync(fd);}
  const parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  exactKeys(parsed,[
    "accepted_enforcement_lock_git_blob_sha1","accepted_enforcement_lock_id",
    "accepted_enforcement_lock_sha256","accepted_enforcement_set_sha256",
    "candidate_enforcement_identity_accepted","complete_executable_closure_verified",
    "marker","process_source_branch","process_source_commit","process_source_marker",
    "process_source_tree","receipt_id","reviewed_source_file_count",
    "reviewed_source_files_sha256","status","version",
  ],"deployment_receipt_schema_invalid");
  assert.equal(parsed.marker,VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1);
  assert.equal(parsed.version,1);
  assert.equal(parsed.status,"DEPLOYED_SOURCE_FINALITY_GENERATION_ACCEPTED");
  assert.equal(parsed.process_source_marker,"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1");
  assert.equal(parsed.process_source_branch,"main");
  assert.match(String(parsed.process_source_commit||""),SHA40);
  assert.match(String(parsed.process_source_tree||""),SHA40);
  assert.match(String(parsed.reviewed_source_file_count||""),/^[1-9][0-9]*$/u);
  assert.match(String(parsed.reviewed_source_files_sha256||""),SHA256);
  const reviewedSources=inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
  assert.equal(parsed.reviewed_source_file_count,
    reviewedSources.reviewed_source_file_count,
    "deployment_receipt_reviewed_source_count_mismatch");
  assert.equal(parsed.reviewed_source_files_sha256,
    reviewedSources.reviewed_source_files_sha256,
    "deployment_receipt_reviewed_source_digest_mismatch");
  assert.match(String(parsed.accepted_enforcement_set_sha256||""),SHA256,
    "deployment_receipt_enforcement_set_invalid");
  assert.equal(parsed.candidate_enforcement_identity_accepted,true,
    "deployment_receipt_enforcement_identity_not_accepted");
  assert.equal(parsed.complete_executable_closure_verified,true,
    "deployment_receipt_executable_closure_not_verified");
  assert.match(String(parsed.accepted_enforcement_lock_git_blob_sha1||""),SHA40,
    "deployment_receipt_enforcement_lock_blob_invalid");
  assert.match(String(parsed.accepted_enforcement_lock_sha256||""),SHA256,
    "deployment_receipt_enforcement_lock_sha256_invalid");
  assert.match(String(parsed.accepted_enforcement_lock_id||""),ENFORCEMENT_LOCK_ID,
    "deployment_receipt_enforcement_lock_id_invalid");
  assert.equal(
    parsed.accepted_enforcement_lock_id,
    buyVoidSourceFinalityEnforcementLockIdV7({
      accepted_enforcement_set_sha256:String(parsed.accepted_enforcement_set_sha256),
      accepted_enforcement_lock_git_blob_sha1:
        String(parsed.accepted_enforcement_lock_git_blob_sha1),
      accepted_enforcement_lock_sha256:String(parsed.accepted_enforcement_lock_sha256),
    }),
    "deployment_receipt_enforcement_lock_identity_mismatch",
  );
  assert.match(String(parsed.receipt_id||""),DEPLOYMENT_ID);
  const withoutId=Object.fromEntries(
    Object.entries(parsed).filter(([key])=>key!=="receipt_id"),
  );
  assert.equal(parsed.receipt_id,
    buyVoidSourceFinalityDeploymentReceiptIdV7(withoutId),
    "deployment_receipt_content_address_mismatch");
  assert.equal(JSON.stringify(parsed,null,2)+"\n",bytes.toString("utf8"),
    "deployment_receipt_wire_format_mismatch");
  return Object.freeze({
    deployment_receipt_id:String(parsed.receipt_id),
    accepted_enforcement_set_sha256:String(parsed.accepted_enforcement_set_sha256),
  });
}

export function buildProviderPairReceiptV1(
  deployment:DeploymentBinding,
  input:PairInput,
){
  assert.match(deployment.deployment_receipt_id,DEPLOYMENT_ID);
  assert.match(deployment.accepted_enforcement_set_sha256,SHA256,
    "deployment_enforcement_set_invalid");
  const basePrimary=safeId(input.base_primary_identity,"base_primary_identity");
  const baseSecondary=safeId(input.base_secondary_identity,"base_secondary_identity");
  const ethPrimary=safeId(input.ethereum_primary_identity,"ethereum_primary_identity");
  const ethSecondary=safeId(input.ethereum_secondary_identity,"ethereum_secondary_identity");
  const basePrimaryFp=fingerprint(input.base_primary_fingerprint_sha256,"base_primary_fingerprint");
  const baseSecondaryFp=fingerprint(input.base_secondary_fingerprint_sha256,"base_secondary_fingerprint");
  const ethPrimaryFp=fingerprint(input.ethereum_primary_fingerprint_sha256,"ethereum_primary_fingerprint");
  const ethSecondaryFp=fingerprint(input.ethereum_secondary_fingerprint_sha256,"ethereum_secondary_fingerprint");
  assert.notEqual(basePrimary,baseSecondary,"base_provider_identities_not_distinct");
  assert.notEqual(basePrimaryFp,baseSecondaryFp,"base_provider_fingerprints_not_distinct");
  assert.notEqual(ethPrimary,ethSecondary,"ethereum_provider_identities_not_distinct");
  assert.notEqual(ethPrimaryFp,ethSecondaryFp,"ethereum_provider_fingerprints_not_distinct");

  const material={
    schema:"void_buy_void_source_finality_provider_pair_binding_v1" as const,
    marker:"VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_RECEIPT_V1" as const,
    version:1 as const,
    status:"operator_approved_provider_pair_binding" as const,
    deployment_receipt_id:deployment.deployment_receipt_id,
    accepted_enforcement_set_sha256:deployment.accepted_enforcement_set_sha256,
    rails:[
      {
        source_chain:"base" as const,
        primary:{rpc_identity:basePrimary,rpc_url_fingerprint_sha256:basePrimaryFp},
        secondary:{rpc_identity:baseSecondary,rpc_url_fingerprint_sha256:baseSecondaryFp},
      },
      {
        source_chain:"ethereum" as const,
        primary:{rpc_identity:ethPrimary,rpc_url_fingerprint_sha256:ethPrimaryFp},
        secondary:{rpc_identity:ethSecondary,rpc_url_fingerprint_sha256:ethSecondaryFp},
      },
    ] as const,
    authority:{
      operator_approved_provider_pair_binding:true as const,
      legal_provider_identity_verified:false as const,
      rpc_contact:false as const,
      production_source_finality_authority_ready:false as const,
      public_presale_activation:false as const,
      funds_movement:false as const,
    },
  };
  const receipt_id=buyVoidSourceFinalityProviderPairBindingReceiptIdV1(material as any);
  const receipt=Object.freeze({...material,receipt_id});
  const bytes=Buffer.from(canonical(receipt)+"\n","utf8");
  assert.ok(bytes.length>1&&bytes.length<=MAX_BYTES,"provider_pair_receipt_size_invalid");
  return Object.freeze({receipt,receipt_id,bytes});
}

function verifyInstalled(absolute:string,expected:Buffer):void{
  assertRootAncestors(absolute);
  const st=fs.lstatSync(absolute);
  assert.ok(st.isFile()&&!st.isSymbolicLink(),"provider_pair_receipt_not_regular");
  assert.equal(st.uid,0,"provider_pair_receipt_not_root_owned");
  assert.equal(st.gid,0,"provider_pair_receipt_not_root_group");
  assert.equal(st.nlink,1,"provider_pair_receipt_link_count_invalid");
  assert.equal(st.mode&0o7777,0o444,"provider_pair_receipt_mode_invalid");
  assert.ok(fs.readFileSync(absolute).equals(expected),"provider_pair_receipt_bytes_mismatch");
}

export function installProviderPairReceiptCreateOnceV1(input:{
  absolute_path:string;
  bytes:Buffer;
}):Readonly<{created:boolean;already_matching:boolean}>{
  if(process.platform!=="linux")throw Error("linux_required");
  if(typeof process.getuid!=="function"||process.getuid()!==0)
    throw Error("root_required_for_provider_pair_receipt_install");
  const absolute=path.resolve(input.absolute_path);
  assert.equal(absolute,input.absolute_path,"provider_pair_receipt_path_not_canonical");
  assert.ok(path.isAbsolute(absolute),"provider_pair_receipt_path_not_absolute");
  assert.ok(Buffer.isBuffer(input.bytes)&&input.bytes.length>1&&input.bytes.length<=MAX_BYTES,
    "provider_pair_receipt_bytes_invalid");
  const parent=path.dirname(absolute);
  assertRootAncestors(absolute);
  if(fs.existsSync(absolute)){
    verifyInstalled(absolute,input.bytes);
    return Object.freeze({created:false,already_matching:true});
  }
  const temp=path.join(parent,
    "."+path.basename(absolute)+".tmp-"+String(process.pid)+"-"+
    crypto.randomBytes(8).toString("hex"));
  let fd=-1;
  try{
    fd=fs.openSync(temp,
      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,
      0o400);
    fs.writeFileSync(fd,input.bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd,0o444);
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd=-1;
    fs.linkSync(temp,absolute);
    fs.unlinkSync(temp);
    const dirfd=fs.openSync(parent,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
    try{fs.fsyncSync(dirfd);}finally{fs.closeSync(dirfd);}
  }finally{
    if(fd>=0)fs.closeSync(fd);
    if(fs.existsSync(temp))fs.unlinkSync(temp);
  }
  verifyInstalled(absolute,input.bytes);
  return Object.freeze({created:true,already_matching:false});
}

function value(argv:string[],i:number,label:string):string{
  const v=argv[i+1];
  if(!v||v.startsWith("--"))throw Error(label+"_required");
  return v;
}
function parseArgs(argv:string[]){
  let mode:"plan"|"apply"="plan",confirm="";
  const pair:Record<string,string>={};
  for(let i=0;i<argv.length;i+=1){
    const arg=argv[i];
    if(arg==="--plan")mode="plan";
    else if(arg==="--apply")mode="apply";
    else if(arg==="--confirm")confirm=value(argv,i++,arg);
    else if([
      "--base-primary-id","--base-primary-url-fingerprint-sha256",
      "--base-secondary-id","--base-secondary-url-fingerprint-sha256",
      "--ethereum-primary-id","--ethereum-primary-url-fingerprint-sha256",
      "--ethereum-secondary-id","--ethereum-secondary-url-fingerprint-sha256",
    ].includes(arg))pair[arg]=value(argv,i++,arg);
    else throw Error("unknown_argument:"+arg);
  }
  return Object.freeze({
    mode,confirm,
    input:{
      base_primary_identity:pair["--base-primary-id"]||"",
      base_primary_fingerprint_sha256:pair["--base-primary-url-fingerprint-sha256"]||"",
      base_secondary_identity:pair["--base-secondary-id"]||"",
      base_secondary_fingerprint_sha256:pair["--base-secondary-url-fingerprint-sha256"]||"",
      ethereum_primary_identity:pair["--ethereum-primary-id"]||"",
      ethereum_primary_fingerprint_sha256:pair["--ethereum-primary-url-fingerprint-sha256"]||"",
      ethereum_secondary_identity:pair["--ethereum-secondary-id"]||"",
      ethereum_secondary_fingerprint_sha256:pair["--ethereum-secondary-url-fingerprint-sha256"]||"",
    } satisfies PairInput,
  });
}

function main():void{
  const args=parseArgs(process.argv.slice(2));
  console.log(MARKER);
  console.log("mode="+args.mode);
  console.log("raw_rpc_url_input=false");
  console.log("rpc_url_fingerprint_input=true");
  console.log("rpc_contact=false");
  console.log("credential_access=false");
  console.log("wallet_or_signer_access=false");
  console.log("transaction_signing=false");
  console.log("transaction_broadcast=false");
  console.log("service_mutation=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");

  const deployment=readDeploymentBindingV1(DEPLOYMENT_RECEIPT_PATH);
  const built=buildProviderPairReceiptV1(deployment,args.input);
  console.log("deployment_receipt_id="+deployment.deployment_receipt_id);
  console.log("accepted_enforcement_set_sha256="+deployment.accepted_enforcement_set_sha256);
  console.log("provider_pair_receipt_id="+built.receipt_id);
  console.log("provider_pair_receipt_path="+
    VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_PATH_V1);

  if(args.mode==="plan"){
    console.log("host_mutation=false");
    console.log("status=PROVIDER_PAIR_RECEIPT_INSTALL_PLAN_GREEN");
    return;
  }
  if(args.confirm!==APPLY_CONFIRMATION)throw Error("apply_confirmation_required");
  const result=installProviderPairReceiptCreateOnceV1({
    absolute_path:VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_PATH_V1,
    bytes:built.bytes,
  });
  console.log("host_mutation=true");
  console.log("receipt_install_created="+String(result.created));
  console.log("receipt_install_already_matching="+String(result.already_matching));
  console.log("status=PROVIDER_PAIR_RECEIPT_INSTALL_GREEN");
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(error){
    console.error("status=PROVIDER_PAIR_RECEIPT_INSTALL_HOLD");
    console.error("reason="+String((error as Error)?.message||"unknown"));
    process.exitCode=2;
  }
}
