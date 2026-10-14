#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_AUTHORITY_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_PATH_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1,
  assertBuyVoidSourceFinalityProviderPairVerifiedV1,
  buyVoidSourceFinalityProviderPairBindingReceiptIdV1,
  verifyBuyVoidSourceFinalityProviderPairBindingV1,
} from "../dist/economic/buy_void_source_finality_provider_pair_binding_v1.js";

const SOURCE=fileURLToPath(
  new URL(
    "../src/economic/buy_void_source_finality_provider_pair_binding_v1.ts",
    import.meta.url,
  ),
);

function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort().map(
      key=>JSON.stringify(key)+":"+canonical(value[key]),
    ).join(",")+"}";
  }
  throw new Error("invalid canonical fixture");
}

const deploymentReceiptId="voidbsfdep1_"+"a".repeat(64);
const enforcementSet="b".repeat(64);
const basePrimary=Object.freeze({
  rpc_identity:"base.primary.operator-approved.v1",
  rpc_url_fingerprint_sha256:"1".repeat(64),
});
const baseSecondary=Object.freeze({
  rpc_identity:"base.secondary.operator-approved.v1",
  rpc_url_fingerprint_sha256:"2".repeat(64),
});
const ethPrimary=Object.freeze({
  rpc_identity:"ethereum.primary.operator-approved.v1",
  rpc_url_fingerprint_sha256:"3".repeat(64),
});
const ethSecondary=Object.freeze({
  rpc_identity:"ethereum.secondary.operator-approved.v1",
  rpc_url_fingerprint_sha256:"4".repeat(64),
});
const authority=Object.freeze({
  operator_approved_provider_pair_binding:true,
  legal_provider_identity_verified:false,
  rpc_contact:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
});
const material=Object.freeze({
  schema:"void_buy_void_source_finality_provider_pair_binding_v1",
  marker:"VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_RECEIPT_V1",
  version:1,
  status:"operator_approved_provider_pair_binding",
  deployment_receipt_id:deploymentReceiptId,
  accepted_enforcement_set_sha256:enforcementSet,
  rails:Object.freeze([
    Object.freeze({
      source_chain:"base",
      primary:basePrimary,
      secondary:baseSecondary,
    }),
    Object.freeze({
      source_chain:"ethereum",
      primary:ethPrimary,
      secondary:ethSecondary,
    }),
  ]),
  authority,
});
const receipt=Object.freeze({
  ...material,
  receipt_id:buyVoidSourceFinalityProviderPairBindingReceiptIdV1(material),
});
const receiptBytes=Buffer.from(canonical(receipt)+"\n","utf8");

function fakeDirectoryStat({mode=0o40755,ino=1}={}){
  return {
    dev:7,ino,uid:0,gid:0,mode,nlink:2,size:0,mtimeMs:1000,ctimeMs:1000,
    isDirectory(){return true;},
    isFile(){return false;},
    isSymbolicLink(){return false;},
  };
}
function fakeFileStat({
  mode=0o100444,
  ino=41,
  size=receiptBytes.length,
  symlink=false,
}={}){
  return {
    dev:7,ino,uid:0,gid:0,mode,nlink:1,size,mtimeMs:1000,ctimeMs:1000,
    isDirectory(){return false;},
    isFile(){return !symlink;},
    isSymbolicLink(){return symlink;},
  };
}

function withRootReceiptFixture(options,callback){
  const original={
    lstatSync:fs.lstatSync,
    openSync:fs.openSync,
    fstatSync:fs.fstatSync,
    readFileSync:fs.readFileSync,
    closeSync:fs.closeSync,
    realpathSync:fs.realpathSync,
  };
  const originalRealpathNative=fs.realpathSync.native;
  const receiptPath=
    VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_PATH_V1;
  const bytes=options.bytes??receiptBytes;
  const fakeFd=987651;
  let receiptLstats=0;
  let openFlags=0;
  const fakeRealpath=(target,...args)=>{
    if(
      target===receiptPath||
      target==="/var"||
      target==="/var/lib"||
      target==="/var/lib/void-source-finality-v7"
    ) return target;
    return original.realpathSync(target,...args);
  };
  fakeRealpath.native=(target,...args)=>{
    if(
      target===receiptPath||
      target==="/var"||
      target==="/var/lib"||
      target==="/var/lib/void-source-finality-v7"
    ) return target;
    return originalRealpathNative(target,...args);
  };
  try{
    fs.lstatSync=(target,...args)=>{
      if(target===receiptPath){
        receiptLstats+=1;
        if(options.symlinkReceipt===true){
          return fakeFileStat({size:bytes.length,symlink:true});
        }
        return fakeFileStat({
          ino:options.replaceAfterRead===true&&receiptLstats>1?42:41,
          size:bytes.length,
          mode:options.fileMode??0o100444,
        });
      }
      if(
        target==="/var"||
        target==="/var/lib"||
        target==="/var/lib/void-source-finality-v7"
      ){
        const writable=
          options.writableAncestor===target;
        return fakeDirectoryStat({
          mode:writable?0o40777:0o40755,
          ino:target.length,
        });
      }
      return original.lstatSync(target,...args);
    };
    fs.openSync=(target,flags,...args)=>{
      if(target===receiptPath){
        openFlags=Number(flags);
        return fakeFd;
      }
      return original.openSync(target,flags,...args);
    };
    fs.fstatSync=(fd,...args)=>{
      if(fd===fakeFd)return fakeFileStat({size:bytes.length});
      return original.fstatSync(fd,...args);
    };
    fs.readFileSync=(target,...args)=>{
      if(target===fakeFd)return Buffer.from(bytes);
      return original.readFileSync(target,...args);
    };
    fs.closeSync=(fd,...args)=>{
      if(fd===fakeFd)return undefined;
      return original.closeSync(fd,...args);
    };
    fs.realpathSync=fakeRealpath;
    return Object.freeze({result:callback(),openFlags});
  }finally{
    fs.lstatSync=original.lstatSync;
    fs.openSync=original.openSync;
    fs.fstatSync=original.fstatSync;
    fs.readFileSync=original.readFileSync;
    fs.closeSync=original.closeSync;
    fs.realpathSync=original.realpathSync;
  }
}

function verifyBase(overrides={}){
  return verifyBuyVoidSourceFinalityProviderPairBindingV1({
    receipt_path:
      VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_PATH_V1,
    deployment_receipt_id:deploymentReceiptId,
    accepted_enforcement_set_sha256:enforcementSet,
    source_chain:"base",
    primary_rpc_identity:basePrimary.rpc_identity,
    primary_rpc_url_fingerprint_sha256:
      basePrimary.rpc_url_fingerprint_sha256,
    secondary_rpc_identity:baseSecondary.rpc_identity,
    secondary_rpc_url_fingerprint_sha256:
      baseSecondary.rpc_url_fingerprint_sha256,
    ...overrides,
  });
}

const verifiedFixture=withRootReceiptFixture({},()=>verifyBase());
const verified=verifiedFixture.result;
assert.equal(verified.ok,true);
if(!verified.ok)throw new Error(verified.reason);
assert.equal(
  verified.marker,
  VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1,
);
assert.equal(
  verified.status,
  "provider_pair_binding_verified_production_authority_still_hold",
);
assert.equal(verified.receipt_id,receipt.receipt_id);
assert.equal(verified.deployment_receipt_id,deploymentReceiptId);
assert.equal(verified.accepted_enforcement_set_sha256,enforcementSet);
assert.equal(verified.operator_approved_provider_pair_binding,true);
assert.equal(verified.same_chain_distinct_provider_identities_verified,true);
assert.equal(verified.same_chain_distinct_rpc_fingerprints_verified,true);
assert.equal(verified.legal_provider_identity_verified,false);
assert.equal(verified.rpc_contact,false);
assert.equal(verified.production_source_finality_authority_ready,false);
assert.equal(verified.public_presale_activation,false);
assert.equal(verified.funds_movement,false);
assert.ok(
  (verifiedFixture.openFlags&Number(fs.constants.O_NOFOLLOW||0))!==0,
  "root receipt must be opened O_NOFOLLOW",
);
assert.doesNotThrow(
  ()=>assertBuyVoidSourceFinalityProviderPairVerifiedV1(verified),
);

const cloned=structuredClone(verified);
assert.throws(
  ()=>assertBuyVoidSourceFinalityProviderPairVerifiedV1(cloned),
  /provider_pair_verified_result_not_module_branded/u,
);
assert.throws(
  ()=>assertBuyVoidSourceFinalityProviderPairVerifiedV1({...verified}),
  /provider_pair_verified_result_not_module_branded/u,
);
assert.throws(
  ()=>assertBuyVoidSourceFinalityProviderPairVerifiedV1({
    ...verified,
    production_source_finality_authority_ready:true,
  }),
  /provider_pair_verified_result_not_module_branded/u,
);

for(const [label,overrides] of [
  ["deployment",{
    deployment_receipt_id:"voidbsfdep1_"+"9".repeat(64),
  }],
  ["enforcement",{
    accepted_enforcement_set_sha256:"8".repeat(64),
  }],
  ["primary identity",{
    primary_rpc_identity:"base.other.v1",
  }],
  ["primary fingerprint",{
    primary_rpc_url_fingerprint_sha256:"7".repeat(64),
  }],
  ["secondary identity",{
    secondary_rpc_identity:"base.other-secondary.v1",
  }],
  ["secondary fingerprint",{
    secondary_rpc_url_fingerprint_sha256:"6".repeat(64),
  }],
]){
  const result=withRootReceiptFixture(
    {},
    ()=>verifyBase(overrides),
  ).result;
  assert.equal(result.ok,false,label);
  if(result.ok)throw new Error("expected HOLD: "+label);
  assert.equal(result.provider_pair_binding_verified,false);
  assert.equal(result.production_source_finality_authority_ready,false);
}

{
  const result=withRootReceiptFixture({},()=>verifyBase({
    secondary_rpc_identity:basePrimary.rpc_identity,
  })).result;
  assert.equal(result.ok,false);
}
{
  const result=withRootReceiptFixture({},()=>verifyBase({
    secondary_rpc_url_fingerprint_sha256:
      basePrimary.rpc_url_fingerprint_sha256,
  })).result;
  assert.equal(result.ok,false);
}

for(const [label,options,reason] of [
  ["symlink receipt",{symlinkReceipt:true},"provider_pair_receipt_custody_invalid"],
  ["writable ancestor",{writableAncestor:"/var/lib"},"provider_pair_receipt_ancestor_custody_invalid"],
  ["writable leaf",{fileMode:0o100644},"provider_pair_receipt_custody_invalid"],
  ["replaced receipt",{replaceAfterRead:true},"provider_pair_receipt_changed_during_read"],
]){
  const result=withRootReceiptFixture(options,()=>verifyBase()).result;
  assert.equal(result.ok,false,label);
  if(result.ok)throw new Error("expected HOLD: "+label);
  assert.equal(result.reason,reason,label);
}

{
  const badAuthority={
    ...authority,
    production_source_finality_authority_ready:true,
  };
  const badMaterial={...material,authority:badAuthority};
  const badReceipt={
    ...badMaterial,
    receipt_id:buyVoidSourceFinalityProviderPairBindingReceiptIdV1(badMaterial),
  };
  const bytes=Buffer.from(canonical(badReceipt)+"\n","utf8");
  const result=withRootReceiptFixture({bytes},()=>verifyBase()).result;
  assert.equal(result.ok,false);
  if(result.ok)throw new Error("expanded authority unexpectedly accepted");
  assert.equal(result.reason,"provider_pair_authority_invalid");
}

{
  const badRails=structuredClone(material.rails);
  badRails[0].secondary.rpc_identity=badRails[0].primary.rpc_identity;
  const badMaterial={...material,rails:badRails};
  const badReceipt={
    ...badMaterial,
    receipt_id:buyVoidSourceFinalityProviderPairBindingReceiptIdV1(badMaterial),
  };
  const bytes=Buffer.from(canonical(badReceipt)+"\n","utf8");
  const result=withRootReceiptFixture({bytes},()=>verifyBase()).result;
  assert.equal(result.ok,false);
}

for(const [key,expected] of Object.entries({
  source_only_gate:true,
  root_custodied_receipt_required:true,
  operator_approved_provider_pair_required:true,
  same_chain_distinct_provider_identities_required:true,
  same_chain_distinct_rpc_fingerprints_required:true,
  deployment_receipt_binding_required:true,
  accepted_enforcement_set_binding_required:true,
  verified_result_module_brand_required:true,
  legal_provider_identity_verified:false,
  rpc_contact:false,
  rpc_write:false,
  host_mutation:false,
  service_mutation:false,
  credential_access:false,
  wallet_or_signer_access:false,
  transaction_signing:false,
  transaction_broadcast:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(SOURCE,"utf8");
for(const required of [
  "WeakSet",
  "O_NOFOLLOW",
  "provider_pair_verified_result_not_module_branded",
  "provider_pair_rpc_identities_not_distinct",
  "provider_pair_rpc_fingerprints_not_distinct",
  "provider_pair_deployment_receipt_mismatch",
  "provider_pair_enforcement_set_mismatch",
]){
  assert.equal(source.includes(required),true,required);
}
for(const forbidden of [
  "node:http",
  "node:https",
  "fetch(",
  "eth_sendRawTransaction",
  "signTransaction(",
]){
  assert.equal(
    source.includes(forbidden),
    false,
    "provider-pair gate gained forbidden capability: "+forbidden,
  );
}

console.log("VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1_PROOF_GREEN");
console.log("root_custodied_receipt_required=true");
console.log("deployment_receipt_binding_required=true");
console.log("accepted_enforcement_set_binding_required=true");
console.log("same_chain_distinct_provider_identities_required=true");
console.log("same_chain_distinct_rpc_fingerprints_required=true");
console.log("verified_result_module_brand_required=true");
console.log("cloned_verified_result_rejected=true");
console.log("synthetic_verified_result_rejected=true");
console.log("symlink_receipt_rejected=true");
console.log("writable_ancestor_rejected=true");
console.log("replaced_receipt_rejected=true");
console.log("legal_provider_identity_verified=false");
console.log("rpc_contact=false");
console.log("production_source_finality_authority_ready=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
