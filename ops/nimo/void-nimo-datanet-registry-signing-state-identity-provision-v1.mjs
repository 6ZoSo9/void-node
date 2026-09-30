#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";

import {
  VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_CONFIRMATION_V1,
  VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1,
  buildVoidDatanetRegistrySigningStateIdentityProvisionReceiptV1,
  buildVoidDatanetRegistrySigningStateIdentityV1,
  validateVoidDatanetRegistrySigningStateIdentityV1,
  voidDatanetRegistrySigningStateIdentityCanonicalJsonV1,
} from "../../tools/void-datanet-registry-signing-state-identity-provision-v1.mjs";

const ROOT=process.cwd();
const STATE_ROOT=path.join(
  os.homedir(),
  ".local/state/void/datanet-registry-signing-v1",
);
const CONFIG_DIR=path.join(os.homedir(),".config/void");
const IDENTITY_FILE=path.join(
  CONFIG_DIR,
  "datanet-registry-signing-state-identity-v1.json",
);

function fail(reason){
  const error=new Error(reason);
  error.name="VoidDatanetRegistrySigningStateIdentityProvisionHoldV1";
  throw error;
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function git(args){
  return execFileSync("git",args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  }).trim();
}
function parseArgs(argv){
  const out={apply:false,confirmation:"",receipt:""};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    if(key==="--apply") out.apply=true;
    else if(key==="--confirmation") out.confirmation=String(argv[++i]||"");
    else if(key==="--receipt") out.receipt=String(argv[++i]||"");
    else fail("unknown_argument:"+String(key));
  }
  if(out.apply&&!out.receipt) fail("receipt_required_for_apply");
  return out;
}
function lstatExists(target){
  try{
    fs.lstatSync(target);
    return true;
  }catch(error){
    if(error?.code==="ENOENT") return false;
    throw error;
  }
}
function assertNoSymlinkAncestors(target){
  const resolved=path.resolve(target);
  const parsed=path.parse(resolved);
  let cursor=parsed.root;
  const relative=resolved.slice(parsed.root.length);
  for(const segment of relative.split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const stat=fs.lstatSync(cursor);
    if(stat.isSymbolicLink()){
      fail("symlink_ancestor_rejected:"+cursor);
    }
  }
}
function canonicalPrivateDir(raw,label,mode){
  const dir=path.resolve(raw);
  assertNoSymlinkAncestors(dir);
  const st=fs.lstatSync(dir);
  if(st.isSymbolicLink()||!st.isDirectory()) fail(label+"_not_directory");
  if(fs.realpathSync.native(dir)!==dir) fail(label+"_not_canonical");
  if(typeof process.getuid==="function"&&st.uid!==process.getuid()){
    fail(label+"_owner_mismatch");
  }
  if((st.mode&0o777)!==mode) fail(label+"_mode_invalid");
  return {dir,stat:st};
}
function canonicalPrivateFile(raw,label,mode,maxBytes=128*1024){
  const file=path.resolve(raw);
  assertNoSymlinkAncestors(file);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) fail(label+"_not_regular");
  if(fs.realpathSync.native(file)!==file) fail(label+"_not_canonical");
  if(typeof process.getuid==="function"&&st.uid!==process.getuid()){
    fail(label+"_owner_mismatch");
  }
  if(st.nlink!==1) fail(label+"_link_count_invalid");
  if((st.mode&0o777)!==mode) fail(label+"_mode_invalid");
  if(st.size<2||st.size>maxBytes) fail(label+"_size_invalid");
  return {file,stat:st};
}
function canonicalReceiptParent(raw,label){
  const dir=path.resolve(raw);
  assertNoSymlinkAncestors(dir);
  const st=fs.lstatSync(dir);
  if(st.isSymbolicLink()||!st.isDirectory()) fail(label+"_not_directory");
  if(fs.realpathSync.native(dir)!==dir) fail(label+"_not_canonical");
  if(typeof process.getuid==="function"&&st.uid!==process.getuid()){
    fail(label+"_owner_mismatch");
  }
  if((st.mode&0o022)!==0) fail(label+"_group_or_world_writable");
  return dir;
}
function readIdentityFile(){
  canonicalPrivateFile(IDENTITY_FILE,"signing_state_identity",0o600);
  let value;
  try{
    value=JSON.parse(
      new TextDecoder("utf-8",{fatal:true}).decode(fs.readFileSync(IDENTITY_FILE)),
    );
  }catch{
    fail("signing_state_identity_invalid_utf8_json");
  }
  return validateVoidDatanetRegistrySigningStateIdentityV1(value);
}
function assertNoPriorConsumption(){
  const entries=fs.readdirSync(STATE_ROOT).sort();
  for(const name of entries){
    if(name!=="consumed") fail("signing_state_root_unexpected_entry:"+name);
  }
  if(!entries.includes("consumed")) return;
  const consumed=path.join(STATE_ROOT,"consumed");
  canonicalPrivateDir(consumed,"signing_consumed_dir",0o700);
  if(fs.readdirSync(consumed).length!==0){
    fail("signing_state_identity_prior_consumption_present");
  }
}
function fsyncDir(dir){
  const fd=fs.openSync(dir,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
  try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function writeExclusiveIdentity(bytes){
  const temp=path.join(
    CONFIG_DIR,
    ".datanet-registry-signing-state-identity-v1.json.tmp."+
      String(process.pid)+"."+String(Date.now()),
  );
  let fd=-1;
  try{
    fd=fs.openSync(
      temp,
      fs.constants.O_WRONLY|
        fs.constants.O_CREAT|
        fs.constants.O_EXCL|
        fs.constants.O_NOFOLLOW,
      0o600,
    );
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o600);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd=-1;
    fs.linkSync(temp,IDENTITY_FILE);
    fsyncDir(CONFIG_DIR);
  }finally{
    if(fd>=0){
      try{fs.closeSync(fd);}catch{}
    }
    try{fs.unlinkSync(temp);}catch{}
  }
}
function writeReceipt(file,value){
  const output=path.resolve(file);
  const parent=path.dirname(output);
  canonicalReceiptParent(parent,"receipt_parent");
  if(lstatExists(output)) fail("receipt_already_exists");
  const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  const temp=path.join(
    parent,
    "."+path.basename(output)+".tmp."+String(process.pid)+"."+String(Date.now()),
  );
  let fd=-1;
  try{
    fd=fs.openSync(
      temp,
      fs.constants.O_WRONLY|
        fs.constants.O_CREAT|
        fs.constants.O_EXCL|
        fs.constants.O_NOFOLLOW,
      0o600,
    );
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o600);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd=-1;
    fs.linkSync(temp,output);
    fsyncDir(parent);
  }finally{
    if(fd>=0){
      try{fs.closeSync(fd);}catch{}
    }
    try{fs.unlinkSync(temp);}catch{}
  }
  canonicalPrivateFile(output,"provision_receipt",0o600);
  if(!fs.readFileSync(output).equals(bytes)){
    fail("receipt_readback_mismatch");
  }
  return output;
}

const args=parseArgs(process.argv.slice(2));
if(os.hostname()!=="Nimo") fail("nimo_host_required");
if(git(["branch","--show-current"])!=="main") fail("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  fail("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);
if(!/^[0-9a-f]{40}$/u.test(currentHead)) fail("repo_head_invalid");

const root=canonicalPrivateDir(
  STATE_ROOT,
  "signing_state_root",
  0o700,
);
const config=canonicalPrivateDir(
  CONFIG_DIR,
  "signing_config_dir",
  0o700,
);
void config;
assertNoPriorConsumption();

const rootBig=fs.lstatSync(root.dir,{bigint:true});
const expected=buildVoidDatanetRegistrySigningStateIdentityV1({
  state_root_realpath:root.dir,
  state_root_dev:String(rootBig.dev),
  state_root_ino:String(rootBig.ino),
});
const expectedBytes=Buffer.from(
  voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(expected)+"\n",
  "utf8",
);

console.log(VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1);
console.log("state_store_id="+expected.state_store_id);
console.log("state_root_realpath_sha256="+sha256(expected.state_root_realpath));
console.log("state_root_dev="+expected.state_root_dev);
console.log("state_root_ino="+expected.state_root_ino);
console.log("state_root_mutation=false");
console.log("consumption_record_mutation=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("signed_transaction_export=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log("apply="+String(args.apply));

if(lstatExists(IDENTITY_FILE)){
  const observed=readIdentityFile();
  if(
    voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(observed)!==
      voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(expected)||
    !fs.readFileSync(IDENTITY_FILE).equals(expectedBytes)
  ){
    fail("signing_state_identity_existing_conflict");
  }
  console.log("identity_file_already_exact=true");
  if(!args.apply){
    console.log(
      VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1+
        "_ALREADY_GREEN_NO_MUTATION",
    );
    process.exit(0);
  }
  if(
    args.confirmation!==
      VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_CONFIRMATION_V1
  ){
    fail("explicit_confirmation_required");
  }
  const identitySha=sha256(fs.readFileSync(IDENTITY_FILE));
  const receipt=buildVoidDatanetRegistrySigningStateIdentityProvisionReceiptV1({
    identity:observed,
    observed_repo_head:currentHead,
    provisioned_at_utc:new Date().toISOString(),
    identity_file_sha256:identitySha,
  });
  const receiptPath=writeReceipt(args.receipt,receipt);
  console.log("identity_file_mutated=false");
  console.log("recovered_receipt_from_exact_existing_identity=true");
  console.log("identity_file_sha256="+identitySha);
  console.log("provision_receipt_id="+receipt.provision_receipt_id);
  console.log("provision_receipt="+receiptPath);
  console.log(
    VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1+
      "_GREEN_EXISTING_IDENTITY_RECEIPT_RECOVERED",
  );
  process.exit(0);
}

if(!args.apply){
  console.log(
    "required_confirmation="+
      VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_CONFIRMATION_V1,
  );
  console.log(
    VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1+"_PLAN_GREEN",
  );
  process.exit(0);
}
if(
  args.confirmation!==
    VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_CONFIRMATION_V1
){
  fail("explicit_confirmation_required");
}

writeExclusiveIdentity(expectedBytes);
const observed=readIdentityFile();
if(
  voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(observed)!==
    voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(expected)||
  !fs.readFileSync(IDENTITY_FILE).equals(expectedBytes)
){
  fail("signing_state_identity_readback_mismatch");
}

const identitySha=sha256(fs.readFileSync(IDENTITY_FILE));
const receipt=buildVoidDatanetRegistrySigningStateIdentityProvisionReceiptV1({
  identity:observed,
  observed_repo_head:currentHead,
  provisioned_at_utc:new Date().toISOString(),
  identity_file_sha256:identitySha,
});
const receiptPath=writeReceipt(args.receipt,receipt);

console.log("identity_file_created=true");
console.log("identity_file_mode=0600");
console.log("identity_file_sha256="+identitySha);
console.log("provision_receipt_id="+receipt.provision_receipt_id);
console.log("provision_receipt="+receiptPath);
console.log("state_root_mutation=false");
console.log("consumption_record_mutation=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("signed_transaction_export=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log(
  VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1+"_GREEN",
);
