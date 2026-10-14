#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  assertProviderPairApplyBindingV1,
  buildProviderPairReceiptV1,
  installProviderPairReceiptCreateOnceV1,
  readDeploymentBindingV1,
  MARKER,
} from "../ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
  buyVoidSourceFinalityDeploymentReceiptIdV7,
  buyVoidSourceFinalityEnforcementLockIdV7,
  inspectBuyVoidSourceFinalityReviewedSourceFilesV7,
} from "../src/economic/buy_void_source_finality_generation_provenance_v7.js";
import {
  buyVoidSourceFinalityProviderPairBindingReceiptIdV1,
} from "../src/economic/buy_void_source_finality_provider_pair_binding_v1.js";

const FRESH_SET="a".repeat(64);
const LOCK_BLOB="8".repeat(40);
const LOCK_SHA256="9".repeat(64);
const LOCK_ID=buyVoidSourceFinalityEnforcementLockIdV7({
  accepted_enforcement_set_sha256:FRESH_SET,
  accepted_enforcement_lock_git_blob_sha1:LOCK_BLOB,
  accepted_enforcement_lock_sha256:LOCK_SHA256,
});

function canonical(value:any):string{
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort()
    .map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
}

const reviewedSources=inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
const workflowPath=
  ".github/workflows/buy-void-source-finality-live-process-binding-v2-receipt-publish-v1.yml";
const workflow=fs.readFileSync(workflowPath,"utf8");
for(const required of [
  "ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts",
  "scripts/prove_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts",
  "docs/operators/buy-void-source-finality-provider-pair-binding-receipt-install-v2.md",
]){
  const needle='      - "'+required+'"';
  assert.equal(workflow.split(needle).length-1,2,
    "current provider installer dependency must be in PR/main triggers: "+required);
}

const deploymentBody={
  accepted_enforcement_lock_git_blob_sha1:LOCK_BLOB,
  accepted_enforcement_lock_id:LOCK_ID,
  accepted_enforcement_lock_sha256:LOCK_SHA256,
  accepted_enforcement_set_sha256:FRESH_SET,
  candidate_enforcement_identity_accepted:true,
  complete_executable_closure_verified:true,
  marker:VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
  process_source_branch:"main",
  process_source_commit:"1".repeat(40),
  process_source_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  process_source_tree:"2".repeat(40),
  reviewed_source_file_count:reviewedSources.reviewed_source_file_count,
  reviewed_source_files_sha256:reviewedSources.reviewed_source_files_sha256,
  status:"DEPLOYED_SOURCE_FINALITY_GENERATION_ACCEPTED",
  version:1,
};
const deploymentReceipt={
  ...deploymentBody,
  receipt_id:buyVoidSourceFinalityDeploymentReceiptIdV7(deploymentBody),
};
const deployment={
  deployment_receipt_id:deploymentReceipt.receipt_id,
  accepted_enforcement_set_sha256:FRESH_SET,
};
const pair={
  base_primary_identity:"base-primary",
  base_primary_fingerprint_sha256:"4".repeat(64),
  base_secondary_identity:"base-secondary",
  base_secondary_fingerprint_sha256:"5".repeat(64),
  ethereum_primary_identity:"eth-primary",
  ethereum_primary_fingerprint_sha256:"6".repeat(64),
  ethereum_secondary_identity:"eth-secondary",
  ethereum_secondary_fingerprint_sha256:"7".repeat(64),
};

const built=buildProviderPairReceiptV1(deployment,pair);
assert.match(built.receipt_id,/^voidbsfpp1_[0-9a-f]{64}$/u);
const {receipt_id,...material}=built.receipt as any;
assert.equal(receipt_id,buyVoidSourceFinalityProviderPairBindingReceiptIdV1(material));
assert.equal(built.bytes.toString("utf8"),canonical(built.receipt)+"\n");
assert.equal(built.receipt.deployment_receipt_id,deployment.deployment_receipt_id);
assert.equal(built.receipt.accepted_enforcement_set_sha256,FRESH_SET);

assert.doesNotThrow(()=>assertProviderPairApplyBindingV1({
  expected_receipt_id:built.receipt_id,
  built_receipt_id:built.receipt_id,
  initial_deployment:deployment,
  current_deployment:deployment,
}));
assert.throws(()=>assertProviderPairApplyBindingV1({
  expected_receipt_id:"",
  built_receipt_id:built.receipt_id,
  initial_deployment:deployment,
  current_deployment:deployment,
}),/expected_provider_pair_receipt_id_required/u);
assert.throws(()=>assertProviderPairApplyBindingV1({
  expected_receipt_id:"voidbsfpp1_"+"0".repeat(64),
  built_receipt_id:built.receipt_id,
  initial_deployment:deployment,
  current_deployment:deployment,
}),/provider_pair_expected_receipt_id_mismatch/u);
assert.throws(()=>assertProviderPairApplyBindingV1({
  expected_receipt_id:built.receipt_id,
  built_receipt_id:built.receipt_id,
  initial_deployment:deployment,
  current_deployment:Object.freeze({
    ...deployment,
    accepted_enforcement_set_sha256:"f".repeat(64),
  }),
}),/deployment_receipt_changed_before_apply/u);
assert.notEqual(FRESH_SET,
  "1f83d8e867fc53e8a9ed240f4876f1f9412b7b2dca7c06cbb479dbe38e40a93b");

assert.throws(()=>buildProviderPairReceiptV1(deployment,{
  ...pair,base_secondary_identity:pair.base_primary_identity,
}),/base_provider_identities_not_distinct/u);
assert.throws(()=>buildProviderPairReceiptV1(deployment,{
  ...pair,ethereum_secondary_fingerprint_sha256:pair.ethereum_primary_fingerprint_sha256,
}),/ethereum_provider_fingerprints_not_distinct/u);

const rootCapable=typeof process.getuid==="function"&&process.getuid()===0;
if(rootCapable){
  const root="/root/void-provider-pair-current-enforcement-proof-"+String(process.pid);
  const deploymentPath=path.join(root,"deployment-receipt.json");
  const pairPath=path.join(root,"provider-pair.json");
  try{
    fs.mkdirSync(root,{recursive:true,mode:0o755});
    fs.writeFileSync(deploymentPath,JSON.stringify(deploymentReceipt,null,2)+"\n",{mode:0o444});
    fs.chownSync(deploymentPath,0,0);
    fs.chmodSync(deploymentPath,0o444);

    const observed=readDeploymentBindingV1(deploymentPath);
    assert.deepEqual(observed,deployment);

    const stale=structuredClone(deploymentReceipt) as any;
    stale.reviewed_source_files_sha256="3".repeat(64);
    const {receipt_id:_staleId,...staleBody}=stale;
    stale.receipt_id=buyVoidSourceFinalityDeploymentReceiptIdV7(staleBody);
    fs.chmodSync(deploymentPath,0o600);
    fs.writeFileSync(deploymentPath,JSON.stringify(stale,null,2)+"\n");
    fs.chmodSync(deploymentPath,0o444);
    assert.throws(()=>readDeploymentBindingV1(deploymentPath),
      /deployment_receipt_reviewed_source_digest_mismatch/u);

    const forged=structuredClone(deploymentReceipt) as any;
    forged.accepted_enforcement_lock_id="voidbenfl1_"+"0".repeat(64);
    const {receipt_id:_forgedId,...forgedBody}=forged;
    forged.receipt_id=buyVoidSourceFinalityDeploymentReceiptIdV7(forgedBody);
    fs.chmodSync(deploymentPath,0o600);
    fs.writeFileSync(deploymentPath,JSON.stringify(forged,null,2)+"\n");
    fs.chmodSync(deploymentPath,0o444);
    assert.throws(()=>readDeploymentBindingV1(deploymentPath),
      /deployment_receipt_enforcement_lock_identity_mismatch/u);

    fs.chmodSync(deploymentPath,0o600);
    fs.writeFileSync(deploymentPath,JSON.stringify(deploymentReceipt,null,2)+"\n");
    fs.chmodSync(deploymentPath,0o444);
    assert.deepEqual(readDeploymentBindingV1(deploymentPath),deployment);

    const tempPrefix=(receiptPath:string)=>
      "."+path.basename(receiptPath)+".tmp-";
    const tempEntries=(receiptPath:string)=>{
      const parent=path.dirname(receiptPath);
      const prefix=tempPrefix(receiptPath);
      return fs.readdirSync(parent).filter(name=>name.startsWith(prefix)).sort();
    };
    const proveTempFailureCleanup=(
      label:string,
      method:"fchownSync"|"writeSync"|"fsyncSync"|"fchmodSync",
    )=>{
      const receipt=path.join(root,"provider-"+label+".json");
      const originalOpen=(fs as any).openSync;
      const originalTarget=(fs as any)[method];
      let tempFd=-1;
      let injected=false;
      try{
        (fs as any).openSync=function(...args:any[]){
          const fd=originalOpen.apply(fs,args);
          if(String(args[0]).includes(tempPrefix(receipt)))tempFd=fd;
          return fd;
        };
        (fs as any)[method]=function(...args:any[]){
          if(!injected&&tempFd>=0&&Number(args[0])===tempFd){
            injected=true;
            throw Object.assign(
              new Error("synthetic_provider_temp_"+label+"_failure"),
              {code:"EIO"},
            );
          }
          return originalTarget.apply(fs,args);
        };
        assert.throws(
          ()=>installProviderPairReceiptCreateOnceV1({
            absolute_path:receipt,bytes:built.bytes,
          }),
          new RegExp("synthetic_provider_temp_"+label+"_failure","u"),
        );
      }finally{
        (fs as any).openSync=originalOpen;
        (fs as any)[method]=originalTarget;
      }
      assert.equal(injected,true,label+"_failure_not_injected");
      assert.equal(fs.existsSync(receipt),false,label+"_published_receipt");
      assert.deepEqual(tempEntries(receipt),[],label+"_temp_survived");
    };

    proveTempFailureCleanup("fchown","fchownSync");
    proveTempFailureCleanup("write","writeSync");
    proveTempFailureCleanup("fsync","fsyncSync");
    proveTempFailureCleanup("fchmod","fchmodSync");

    {
      const receipt=path.join(root,"provider-foreign.json");
      const originalOpen=(fs as any).openSync;
      const originalFchown=(fs as any).fchownSync;
      let tempFd=-1;
      let tempPath="";
      let foreignVisible="";
      let foreignIdentity:fs.Stats|undefined;
      try{
        (fs as any).openSync=function(...args:any[]){
          const fd=originalOpen.apply(fs,args);
          if(String(args[0]).includes(tempPrefix(receipt))){
            tempFd=fd;
            tempPath=String(args[0]);
            foreignVisible=path.join(path.dirname(receipt),path.basename(tempPath));
          }
          return fd;
        };
        (fs as any).fchownSync=function(fd:number,uid:number,gid:number){
          if(tempFd>=0&&fd===tempFd&&!foreignIdentity){
            fs.unlinkSync(tempPath);
            fs.writeFileSync(tempPath,"foreign\n",{mode:0o600});
            fs.chownSync(tempPath,0,0);
            foreignIdentity=fs.lstatSync(tempPath);
            throw Object.assign(
              new Error("synthetic_provider_foreign_substitution"),
              {code:"EIO"},
            );
          }
          return originalFchown.call(fs,fd,uid,gid);
        };
        assert.throws(
          ()=>installProviderPairReceiptCreateOnceV1({
            absolute_path:receipt,bytes:built.bytes,
          }),
          /synthetic_provider_foreign_substitution/u,
        );
      }finally{
        (fs as any).openSync=originalOpen;
        (fs as any).fchownSync=originalFchown;
      }
      assert.ok(foreignIdentity);
      const after=fs.lstatSync(foreignVisible);
      assert.equal(after.dev,foreignIdentity!.dev);
      assert.equal(after.ino,foreignIdentity!.ino);
      assert.equal(fs.readFileSync(foreignVisible,"utf8"),"foreign\n");
      fs.unlinkSync(foreignVisible);
    }

    const proveCleanupFailureObservable=(
      label:"unlink"|"parent-fsync",
    )=>{
      const receipt=path.join(root,"provider-cleanup-"+label+".json");
      const originalOpen=(fs as any).openSync;
      const originalFchown=(fs as any).fchownSync;
      const originalUnlink=(fs as any).unlinkSync;
      const originalFsync=(fs as any).fsyncSync;
      let tempFd=-1;
      let injectedPrimary=false;
      let injectedCleanup=false;
      try{
        (fs as any).openSync=function(...args:any[]){
          const fd=originalOpen.apply(fs,args);
          if(String(args[0]).includes(tempPrefix(receipt)))tempFd=fd;
          return fd;
        };
        (fs as any).fchownSync=function(fd:number,...args:any[]){
          if(!injectedPrimary&&tempFd>=0&&fd===tempFd){
            injectedPrimary=true;
            throw Object.assign(
              new Error("synthetic_provider_cleanup_primary_"+label),
              {code:"EIO"},
            );
          }
          return originalFchown.call(fs,fd,...args);
        };
        if(label==="unlink"){
          (fs as any).unlinkSync=function(target:string,...args:any[]){
            if(!injectedCleanup&&String(target).includes(tempPrefix(receipt))){
              injectedCleanup=true;
              throw Object.assign(
                new Error("synthetic_provider_cleanup_unlink_failure"),
                {code:"EIO"},
              );
            }
            return originalUnlink.call(fs,target,...args);
          };
        }else{
          (fs as any).fsyncSync=function(fd:number){
            if(!injectedCleanup&&tempFd>=0&&fd!==tempFd){
              injectedCleanup=true;
              throw Object.assign(
                new Error("synthetic_provider_cleanup_parent_fsync_failure"),
                {code:"EIO"},
              );
            }
            return originalFsync.call(fs,fd);
          };
        }
        assert.throws(
          ()=>installProviderPairReceiptCreateOnceV1({
            absolute_path:receipt,bytes:built.bytes,
          }),
          (error:any)=>{
            assert.ok(error instanceof AggregateError,"cleanup_failure_not_aggregate");
            assert.equal(error.message,"provider_pair_receipt_cleanup_failed");
            const messages=Array.from(
              error.errors||[],
              (entry:any)=>String(entry?.message||entry),
            );
            assert.ok(messages.includes(
              "synthetic_provider_cleanup_primary_"+label,
            ));
            assert.ok(messages.includes(
              label==="unlink"
                ?"synthetic_provider_cleanup_unlink_failure"
                :"synthetic_provider_cleanup_parent_fsync_failure",
            ));
            return true;
          },
        );
      }finally{
        (fs as any).openSync=originalOpen;
        (fs as any).fchownSync=originalFchown;
        (fs as any).unlinkSync=originalUnlink;
        (fs as any).fsyncSync=originalFsync;
        for(const name of tempEntries(receipt)){
          fs.unlinkSync(path.join(path.dirname(receipt),name));
        }
      }
      assert.equal(injectedPrimary,true,label+"_primary_failure_not_injected");
      assert.equal(injectedCleanup,true,label+"_cleanup_failure_not_injected");
    };

    proveCleanupFailureObservable("unlink");
    proveCleanupFailureObservable("parent-fsync");

    const first=installProviderPairReceiptCreateOnceV1({
      absolute_path:pairPath,bytes:built.bytes,
    });
    assert.equal(first.created,true);
    const st=fs.lstatSync(pairPath);
    assert.equal(st.uid,0);assert.equal(st.gid,0);
    assert.equal(st.nlink,1);assert.equal(st.mode&0o7777,0o444);
    const second=installProviderPairReceiptCreateOnceV1({
      absolute_path:pairPath,bytes:built.bytes,
    });
    assert.equal(second.already_matching,true);

    const symlinkTarget=path.join(root,"provider-symlink-target");
    const symlinkParent=path.join(root,"provider-symlink-parent");
    fs.mkdirSync(symlinkTarget,{mode:0o755});
    fs.symlinkSync(symlinkTarget,symlinkParent);
    assert.throws(()=>installProviderPairReceiptCreateOnceV1({
      absolute_path:path.join(symlinkParent,"provider-pair.json"),
      bytes:built.bytes,
    }),/provider_pair_install_ancestor_not_direct_directory/u);
    assert.deepEqual(fs.readdirSync(symlinkTarget),[]);
    fs.unlinkSync(symlinkParent);
    fs.chmodSync(pairPath,0o644);
    assert.throws(()=>installProviderPairReceiptCreateOnceV1({
      absolute_path:pairPath,bytes:built.bytes,
    }),/provider_pair_receipt_mode_invalid/u);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

const installerSource=fs.readFileSync(
  "ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts",
  "utf8",
);
assert.equal(
  installerSource.includes("VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7"),
  false,
  "provider-pair installer must not compare deployment evidence to historical enforcement constant",
);
for(const required of [
  "buyVoidSourceFinalityEnforcementLockIdV7",
  "O_NOFOLLOW",
  "/proc/self/fd/",
  "provider_pair_receipt_cleanup_failed",
  "fs.readFileSync(fd)",
  "candidate_enforcement_identity_accepted",
  "complete_executable_closure_verified",
  "deployment_receipt_enforcement_lock_identity_mismatch",
  "rpc_contact=false",
  "credential_access=false",
  "funds_movement=false",
]) assert.equal(installerSource.includes(required),true,required);

console.log(MARKER+"_CURRENT_ENFORCEMENT_PROOF_GREEN");
console.log("synthetic_current_enforcement_set="+FRESH_SET);
console.log("historical_enforcement_constant_dependency=false");
console.log("current_deployment_receipt_schema_bound=true");
console.log("current_v2_reviewed_source_count="+reviewedSources.reviewed_source_file_count);
console.log("accepted_enforcement_lock_identity_bound=true");
console.log("apply_expected_receipt_id_required=true");
console.log("deployment_receipt_reverified_before_apply=true");
console.log("descriptor_relative_provider_publication=true");
console.log("provider_temp_identity_cleanup_exact="+String(rootCapable));
console.log("provider_cleanup_failure_observable="+String(rootCapable));
console.log("provider_foreign_temp_preserved="+String(rootCapable));
console.log("provider_final_read_descriptor_bound=true");
console.log("current_reviewed_source_digest_crossbinding=true");
console.log("provider_pair_dynamic_enforcement_crossbinding=true");
console.log("root_custody_positive_exercised="+String(rootCapable));
console.log("rpc_contact=false");
console.log("credential_access=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
