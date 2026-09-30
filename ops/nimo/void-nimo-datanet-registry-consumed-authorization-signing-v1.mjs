#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
} from "../../tools/void-datanet-registry-deployer-credential-binding-v1.mjs";
import {
  validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1,
} from "../../tools/void-datanet-registry-single-transaction-signing-authorization-v1.mjs";
import {
  voidDatanetRegistrySigningOperationIdV1,
} from "../../tools/void-datanet-registry-single-use-signing-authorization-consumption-v1.mjs";
import {
  validateVoidDatanetRegistrySigningStateIdentityV1,
} from "../../tools/void-datanet-registry-signing-state-identity-provision-v1.mjs";
import {
  buildVoidDatanetRegistrySigningClaimV1,
  buildVoidDatanetRegistrySigningExecutionAdmissionV1,
  signVoidDatanetRegistryConsumedAuthorizationV1,
  validateVoidDatanetRegistrySignedTransactionV1,
} from "../../tools/void-datanet-registry-consumed-authorization-signing-v1.mjs";

const ROOT=process.cwd();
const STATE_ROOT=path.join(
  os.homedir(),
  ".local/state/void/datanet-registry-signing-v1",
);
const STATE_IDENTITY_FILE=path.join(
  os.homedir(),
  ".config/void/datanet-registry-signing-state-identity-v1.json",
);
const MAX_PUBLIC_JSON=24*1024*1024;
const MAX_PRIVATE_JSON=256*1024;
const MAX_CREDENTIAL_BYTES=128;

function fail(reason){
  const error=new Error(reason);
  error.name="VoidDatanetRegistryConsumedAuthorizationSigningHoldV1";
  throw error;
}
function git(args){
  const result=spawnSync("git",args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  });
  if(result.status!==0){
    fail("git_failed:"+String(result.stderr||result.stdout||"").trim().slice(0,220));
  }
  return String(result.stdout||"").trim();
}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    if(!key?.startsWith("--")) fail("invalid_argument:"+String(key));
    const value=String(argv[++i]||"");
    if(!value) fail("missing_argument_value:"+key);
    out[key.slice(2)]=value;
  }
  for(const key of [
    "candidate","deployment-plan","candidate-fee-packet","pre-sign",
    "construction-admission","prior-binding","candidate-revalidation",
    "revalidation-fee-packet","fresh-binding","final-signing-review",
    "signing-request","signing-authorization","credentials-directory",
    "confirmation","output",
  ]){
    if(!out[key]) fail("missing_argument:"+key);
  }
  return out;
}
function regularJson(raw,label,maxBytes=MAX_PUBLIC_JSON){
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) fail(label+"_not_regular");
  if(fs.realpathSync.native(file)!==file) fail(label+"_not_canonical");
  if(st.size<2||st.size>maxBytes) fail(label+"_size_invalid");
  let value;
  try{
    value=JSON.parse(
      new TextDecoder("utf-8",{fatal:true}).decode(fs.readFileSync(file)),
    );
  }catch{
    fail(label+"_invalid_utf8_json");
  }
  return {file,value};
}
function privateJson(raw,label){
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(
    st.isSymbolicLink()||
    !st.isFile()||
    fs.realpathSync.native(file)!==file||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    st.nlink!==1||
    (st.mode&0o777)!==0o600||
    st.size<2||
    st.size>MAX_PRIVATE_JSON
  ){
    fail(label+"_private_file_invalid");
  }
  let value;
  try{
    value=JSON.parse(
      new TextDecoder("utf-8",{fatal:true}).decode(fs.readFileSync(file)),
    );
  }catch{
    fail(label+"_invalid_utf8_json");
  }
  return {file,value};
}
function repoJson(relative,label){
  return regularJson(path.join(ROOT,relative),label).value;
}
function assertNoSymlinkAncestors(target){
  const resolved=path.resolve(target);
  const parsed=path.parse(resolved);
  let cursor=parsed.root;
  for(const segment of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const st=fs.lstatSync(cursor);
    if(st.isSymbolicLink()) fail("symlink_ancestor_rejected");
  }
}
function canonicalPrivateDir(raw,label,mode){
  const dir=path.resolve(raw);
  assertNoSymlinkAncestors(dir);
  const st=fs.lstatSync(dir);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync.native(dir)!==dir||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o777)!==mode
  ){
    fail(label+"_invalid");
  }
  return {dir,stat:st};
}
function fdChildPath(fd,child){
  return "/proc/self/fd/"+String(fd)+"/"+child;
}
function openPinnedRoot(identity){
  const root=canonicalPrivateDir(STATE_ROOT,"signing_state_root",0o700);
  const big=fs.lstatSync(root.dir,{bigint:true});
  if(
    identity.state_root_realpath!==root.dir||
    identity.state_root_dev!==String(big.dev)||
    identity.state_root_ino!==String(big.ino)
  ){
    fail("signing_state_generation_mismatch");
  }
  const fd=fs.openSync(
    root.dir,
    fs.constants.O_RDONLY|
      Number(fs.constants.O_DIRECTORY||0)|
      Number(fs.constants.O_NOFOLLOW||0),
  );
  const pinned=fs.fstatSync(fd,{bigint:true});
  if(
    String(pinned.dev)!==identity.state_root_dev||
    String(pinned.ino)!==identity.state_root_ino
  ){
    fs.closeSync(fd);
    fail("signing_state_pinned_generation_mismatch");
  }
  return {fd,root};
}
function ensurePrivateChildDir(parentFd,name){
  const target=fdChildPath(parentFd,name);
  try{
    const st=fs.lstatSync(target);
    if(
      st.isSymbolicLink()||
      !st.isDirectory()||
      (typeof process.getuid==="function"&&st.uid!==process.getuid())||
      (st.mode&0o777)!==0o700
    ){
      fail("signing_child_directory_invalid:"+name);
    }
  }catch(error){
    if(error?.code!=="ENOENT") throw error;
    fs.mkdirSync(target,{recursive:false,mode:0o700});
    fs.chmodSync(target,0o700);
    fs.fsyncSync(parentFd);
  }
  const fd=fs.openSync(
    target,
    fs.constants.O_RDONLY|
      Number(fs.constants.O_DIRECTORY||0)|
      Number(fs.constants.O_NOFOLLOW||0),
  );
  const st=fs.fstatSync(fd,{bigint:true});
  if(
    !st.isDirectory()||
    (st.mode&0o777n)!==0o700n||
    (
      typeof process.getuid==="function"&&
      st.uid!==BigInt(process.getuid())
    )
  ){
    fs.closeSync(fd);
    fail("signing_child_directory_open_invalid:"+name);
  }
  return fd;
}
function readPrivateRecordAtFd(parentFd,fileName,label){
  const file=fdChildPath(parentFd,fileName);
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const st=fs.fstatSync(fd);
    if(
      !st.isFile()||
      st.nlink!==1||
      (typeof process.getuid==="function"&&st.uid!==process.getuid())||
      (st.mode&0o777)!==0o600||
      st.size<2||
      st.size>MAX_PRIVATE_JSON
    ){
      fail(label+"_invalid");
    }
    const bytes=Buffer.alloc(st.size);
    const read=fs.readSync(fd,bytes,0,bytes.length,0);
    if(read!==bytes.length){
      bytes.fill(0);
      fail(label+"_short_read");
    }
    try{
      return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
    }finally{
      bytes.fill(0);
    }
  }finally{
    fs.closeSync(fd);
  }
}
function atomicClaimAtFd(parentFd,fileName,value){
  const parent="/proc/self/fd/"+String(parentFd);
  const finalPath=path.join(parent,fileName);
  const temp=path.join(
    parent,
    "."+fileName+".tmp-"+String(process.pid)+"-"+String(Date.now()),
  );
  const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  let fd=-1;
  try{
    fd=fs.openSync(
      temp,
      fs.constants.O_WRONLY|
        fs.constants.O_CREAT|
        fs.constants.O_EXCL|
        Number(fs.constants.O_NOFOLLOW||0),
      0o600,
    );
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o600);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd=-1;
    try{
      fs.linkSync(temp,finalPath);
    }catch(error){
      if(error?.code==="EEXIST"){
        fail("registry_signing_operation_already_claimed");
      }
      throw error;
    }
    fs.fsyncSync(parentFd);
  }finally{
    bytes.fill(0);
    if(fd>=0){
      try{fs.closeSync(fd);}catch(closeError){void closeError;}
    }
    try{fs.unlinkSync(temp);}catch(error){
      if(error?.code!=="ENOENT") throw error;
    }
  }
}
function outputPath(raw){
  const file=path.resolve(raw);
  if(fs.existsSync(file)) fail("output_already_exists");
  const parent=path.dirname(file);
  const st=fs.lstatSync(parent);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync.native(parent)!==parent||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o022)!==0
  ){
    fail("output_parent_invalid");
  }
  return file;
}
function writeSignedArtifact(file,value){
  const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  const temp=path.join(
    path.dirname(file),
    "."+path.basename(file)+".tmp-"+String(process.pid)+"-"+String(Date.now()),
  );
  let fd=-1;
  try{
    fd=fs.openSync(
      temp,
      fs.constants.O_WRONLY|
        fs.constants.O_CREAT|
        fs.constants.O_EXCL|
        Number(fs.constants.O_NOFOLLOW||0),
      0o600,
    );
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o600);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd=-1;
    fs.linkSync(temp,file);
    const dirFd=fs.openSync(path.dirname(file),fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
    try{fs.fsyncSync(dirFd);}finally{fs.closeSync(dirFd);}
  }finally{
    bytes.fill(0);
    if(fd>=0){
      try{fs.closeSync(fd);}catch(closeError){void closeError;}
    }
    try{fs.unlinkSync(temp);}catch(error){
      if(error?.code!=="ENOENT") throw error;
    }
  }
}
function hexNibble(code){
  if(code>=48&&code<=57) return code-48;
  if(code>=65&&code<=70) return code-55;
  if(code>=97&&code<=102) return code-87;
  return -1;
}
function privateKeyBytesFromAscii(bytes){
  let start=0;
  let end=bytes.length;
  const whitespace=(code)=>code===9||code===10||code===13||code===32;
  while(start<end&&whitespace(bytes[start])) start+=1;
  while(end>start&&whitespace(bytes[end-1])) end-=1;
  if(end-start===66&&bytes[start]===48&&(bytes[start+1]===120||bytes[start+1]===88)){
    start+=2;
  }
  if(end-start!==64) fail("registry_deployer_private_key_shape_invalid");
  const raw=Buffer.alloc(32);
  for(let i=0;i<32;i+=1){
    const hi=hexNibble(bytes[start+i*2]);
    const lo=hexNibble(bytes[start+i*2+1]);
    if(hi<0||lo<0){
      raw.fill(0);
      fail("registry_deployer_private_key_shape_invalid");
    }
    raw[i]=(hi<<4)|lo;
  }
  return raw;
}
function readCredentialBytes(directory){
  const dir=canonicalPrivateDir(directory,"credentials_directory",0o700);
  const file=path.join(dir.dir,VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1);
  if(path.dirname(file)!==dir.dir) fail("credential_path_escape");
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  let bytes=null;
  try{
    const st=fs.fstatSync(fd);
    if(
      !st.isFile()||
      st.nlink!==1||
      (typeof process.getuid==="function"&&st.uid!==process.getuid())||
      ![0o400,0o600].includes(st.mode&0o777)||
      st.size<64||
      st.size>MAX_CREDENTIAL_BYTES
    ){
      fail("registry_deployer_credential_file_out_of_policy");
    }
    const pathStat=fs.lstatSync(file);
    if(
      pathStat.isSymbolicLink()||
      pathStat.dev!==st.dev||
      pathStat.ino!==st.ino||
      fs.realpathSync.native(file)!==file
    ){
      fail("registry_deployer_credential_file_identity_changed");
    }
    bytes=Buffer.alloc(st.size);
    const read=fs.readSync(fd,bytes,0,bytes.length,0);
    if(read!==bytes.length) fail("registry_deployer_credential_short_read");
    return privateKeyBytesFromAscii(bytes);
  }finally{
    if(bytes) bytes.fill(0);
    fs.closeSync(fd);
  }
}
function requireStillValid(authorization){
  const now=Date.now();
  const authorized=Date.parse(String(authorization.authorized_at_utc||""));
  const expires=Date.parse(String(authorization.valid_until_utc||""));
  if(
    !Number.isFinite(now)||
    !Number.isFinite(authorized)||
    !Number.isFinite(expires)||
    now<authorized||
    now>=expires
  ){
    fail("registry_signing_execution_runtime_expired_or_not_yet_valid");
  }
}

const args=parseArgs(process.argv.slice(2));
if(os.hostname()!=="Nimo") fail("nimo_host_required");
if(git(["branch","--show-current"])!=="main") fail("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  fail("clean_worktree_required");
}
const currentHead=git(["rev-parse","HEAD"]);

const candidate=regularJson(args.candidate,"unsigned_candidate");
const deploymentPlan=regularJson(args["deployment-plan"],"deployment_plan");
const candidateFee=regularJson(args["candidate-fee-packet"],"candidate_fee_packet");
const preSign=regularJson(args["pre-sign"],"pre_sign");
const constructionAdmission=regularJson(
  args["construction-admission"],
  "construction_admission",
);
const priorBinding=regularJson(args["prior-binding"],"prior_binding");
const candidateRevalidation=regularJson(
  args["candidate-revalidation"],
  "candidate_revalidation",
);
const revalidationFee=regularJson(
  args["revalidation-fee-packet"],
  "revalidation_fee_packet",
);
const freshBinding=regularJson(args["fresh-binding"],"fresh_binding");
const finalReview=regularJson(args["final-signing-review"],"final_signing_review");
const signingRequest=regularJson(args["signing-request"],"signing_request");
const signingAuthorization=regularJson(
  args["signing-authorization"],
  "signing_authorization",
);
const stateIdentity=privateJson(
  STATE_IDENTITY_FILE,
  "signing_state_identity",
);
validateVoidDatanetRegistrySigningStateIdentityV1(stateIdentity.value);

const deployerSelection=repoJson(
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
  "deployer_selection",
);
const candidateEvidence={
  deployment_input_plan:deploymentPlan.value,
  fresh_fee_funding_packet:candidateFee.value,
  pre_sign_revalidation_receipt:preSign.value,
  construction_admission:constructionAdmission.value,
};
const signingRequestEvidence={
  unsigned_transaction_candidate:candidate.value,
  candidate_evidence:candidateEvidence,
  final_signing_review:finalReview.value,
  prior_credential_binding:priorBinding.value,
  candidate_revalidation_receipt:candidateRevalidation.value,
  fresh_fee_funding_packet:revalidationFee.value,
  fresh_credential_binding:freshBinding.value,
  deployer_selection:deployerSelection,
};
const authorization=
  validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
    signingAuthorization.value,
    {
      signing_request:signingRequest.value,
      signing_request_evidence:signingRequestEvidence,
    },
  );
if(args.confirmation!==authorization.required_confirmation){
  fail("registry_signing_execution_confirmation_required");
}

for(const head of [
  priorBinding.value.observed_repo_head,
  freshBinding.value.observed_repo_head,
]){
  if(typeof head!=="string"||!/^[0-9a-f]{40}$/u.test(head)){
    fail("credential_binding_repo_head_invalid");
  }
  const check=spawnSync("git",["merge-base","--is-ancestor",head,currentHead],{
    cwd:ROOT,
    stdio:["ignore","ignore","ignore"],
  });
  if(check.status!==0){
    fail("credential_binding_repo_head_not_ancestor:"+head);
  }
}

const operationId=voidDatanetRegistrySigningOperationIdV1(authorization);
const output=outputPath(args.output);
let rootFd=-1;
let consumedFd=-1;
let signingFd=-1;
try{
  const pinned=openPinnedRoot(stateIdentity.value);
  rootFd=pinned.fd;
  consumedFd=ensurePrivateChildDir(rootFd,"consumed");
  const consumption=readPrivateRecordAtFd(
    consumedFd,
    operationId+".json",
    "signing_consumption_record",
  );

  const admittedAt=new Date().toISOString();
  const admission=buildVoidDatanetRegistrySigningExecutionAdmissionV1({
    unsigned_transaction_candidate:candidate.value,
    candidate_evidence:candidateEvidence,
    signing_request:signingRequest.value,
    signing_request_evidence:signingRequestEvidence,
    signing_authorization:authorization,
    consumption_record:consumption,
    state_identity:stateIdentity.value,
    confirmation:args.confirmation,
    signed_at_utc:admittedAt,
  });

  requireStillValid(authorization);
  signingFd=ensurePrivateChildDir(rootFd,"signing");
  const claim=buildVoidDatanetRegistrySigningClaimV1({admission});
  atomicClaimAtFd(signingFd,operationId+".json",claim);

  const liveRoot=fs.lstatSync(STATE_ROOT,{bigint:true});
  const pinnedRoot=fs.fstatSync(rootFd,{bigint:true});
  if(
    fs.realpathSync.native(STATE_ROOT)!==STATE_ROOT||
    String(liveRoot.dev)!==stateIdentity.value.state_root_dev||
    String(liveRoot.ino)!==stateIdentity.value.state_root_ino||
    String(pinnedRoot.dev)!==stateIdentity.value.state_root_dev||
    String(pinnedRoot.ino)!==stateIdentity.value.state_root_ino
  ){
    fail("signing_state_generation_changed_after_claim");
  }
  requireStillValid(authorization);

  const keyBytes=readCredentialBytes(args["credentials-directory"]);
  let signed;
  try{
    signed=await signVoidDatanetRegistryConsumedAuthorizationV1({
      admission,
      signing_claim:claim,
      unsigned_serialized_transaction:
        candidate.value.transaction.unsigned_serialized_transaction,
      private_key_bytes:keyBytes,
    });
  }finally{
    keyBytes.fill(0);
  }
  validateVoidDatanetRegistrySignedTransactionV1(signed);
  writeSignedArtifact(output,signed);

  console.log("VOID_NIMO_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1");
  console.log("current_repo_head="+currentHead);
  console.log("signing_operation_id="+signed.signing_operation_id);
  console.log("signing_claim_id="+signed.signing_claim_id);
  console.log("consumption_record_id="+signed.consumption_record_id);
  console.log("signing_authorization_id="+signed.signing_authorization_id);
  console.log("candidate_id="+signed.candidate_id);
  console.log("signed_transaction_id="+signed.signed_transaction_id);
  console.log("signed_transaction_hash="+signed.signed_transaction_hash);
  console.log("credential_access=true");
  console.log("private_key_access=true");
  console.log("signer_object_exposed=false");
  console.log("transaction_signing=true");
  console.log("signed_transaction_export=true");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast_authorized=false");
  console.log("transaction_broadcast=false");
  console.log("deployment=false");
  console.log("chain2050_write=false");
  console.log("funds_movement=false");
  console.log("automatic_retry=false");
  console.log("signed_artifact="+output);
  console.log("VOID_NIMO_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1_GREEN");
}finally{
  for(const fd of [signingFd,consumedFd,rootFd]){
    if(fd>=0){
      try{fs.closeSync(fd);}catch(closeError){void closeError;}
    }
  }
}
