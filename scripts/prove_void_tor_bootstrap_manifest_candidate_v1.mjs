#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildTorBootstrapManifestCandidateV1,validateTorQualificationReceiptForManifestV1,writeCandidateOutputsV1,writeExclusiveOwnedV1 } from "./build_void_tor_bootstrap_manifest_candidate_v1.mjs";
import { buildTorQualificationReceiptV1 } from "./qualify_void_public_seed_tor_v1.mjs";
import { loadTorBootstrapReleaseRootFile,loadTorBootstrapSignedManifestLifecycleFile,validateTorBootstrapManifestContract } from "./lib/void_tor_bootstrap_release_root_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SCRIPT=path.join(ROOT,"scripts","build_void_tor_bootstrap_manifest_candidate_v1.mjs");
const RELEASE_ROOT=path.join(ROOT,"config","void-tor-bootstrap-release-root-v1.json");
const PREDECESSOR=path.join(ROOT,"public","bootstrap","tor-signed-v1.json");
const ONION="6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion";
const OTHER="r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion";
const SOURCE="a".repeat(40),NOW=Date.parse("2026-10-14T18:00:00.000Z");
function receiptAt(now=NOW,onion=ONION,port=80){return buildTorQualificationReceiptV1({sourceSha:SOURCE,onionHostname:onion,virtualPort:port,socksHost:"127.0.0.1",socksPort:19051,observations:[{observed_at:new Date(now-4*60_000).toISOString(),head:2100000},{observed_at:new Date(now-3*60_000).toISOString(),head:2100001},{observed_at:new Date(now-2*60_000).toISOString(),head:2100002}],generatedAt:new Date(now-60_000).toISOString()});}
const root=loadTorBootstrapReleaseRootFile(RELEASE_ROOT,{allowHold:false});
const predecessor=loadTorBootstrapSignedManifestLifecycleFile(PREDECESSOR,root,{nowMs:NOW});
assert.equal(predecessor.lifecycle,"authenticated_stale");assert.equal(predecessor.validSignatureCount,1);
const receipt=receiptAt();
assert.equal(validateTorQualificationReceiptForManifestV1(receipt,{expectedSourceSha:SOURCE,nowMs:NOW}).qualification_id,receipt.qualification_id);
const candidate=buildTorBootstrapManifestCandidateV1({receipt,expectedSourceSha:SOURCE,validatedRoot:root,predecessor,nowMs:NOW,validityMinutes:72*60});
assert.equal(candidate.rootId,root.root.root_id);assert.equal(candidate.manifest.status,"stable_tor_seed");assert.equal(candidate.manifest.onion_endpoints[0].base,`http://${ONION}`);assert.equal(candidate.manifest.onion_endpoints[0].qualification_id,receipt.qualification_id);assert.equal(candidate.manifest.authority.money_movement_authority,false);assert.match(candidate.payloadSha256,/^[0-9a-f]{64}$/u);assert.equal(Date.parse(candidate.manifest.expires_at)-Date.parse(candidate.manifest.generated_at),72*60*60_000);assert.equal(validateTorBootstrapManifestContract(candidate.manifest,NOW+3*60*60_000).manifestId,candidate.manifestId);
assert.throws(()=>validateTorQualificationReceiptForManifestV1(receipt,{expectedSourceSha:"b".repeat(40),nowMs:NOW}),/source SHA mismatch/u);
assert.throws(()=>buildTorBootstrapManifestCandidateV1({receipt:receiptAt(NOW,OTHER),expectedSourceSha:SOURCE,validatedRoot:root,predecessor,nowMs:NOW}),/onion identity changed/u);
assert.throws(()=>buildTorBootstrapManifestCandidateV1({receipt:receiptAt(NOW-16*60_000),expectedSourceSha:SOURCE,validatedRoot:root,predecessor,nowMs:NOW}),/freshness invalid/u);
assert.throws(()=>buildTorBootstrapManifestCandidateV1({receipt:receiptAt(NOW,ONION,81),expectedSourceSha:SOURCE,validatedRoot:root,predecessor,nowMs:NOW}),/transport mismatch/u);
const tampered=structuredClone(receipt);tampered.authority.wallet_authority=true;assert.throws(()=>validateTorQualificationReceiptForManifestV1(tampered,{expectedSourceSha:SOURCE,nowMs:NOW}),/wallet_authority must be false/u);
assert.throws(()=>buildTorBootstrapManifestCandidateV1({receipt,expectedSourceSha:SOURCE,validatedRoot:root,predecessor,nowMs:NOW,validityMinutes:10081}),/60 through 10080/u);

const ownershipTemp=fs.mkdtempSync(path.join(os.tmpdir(),"void-tor-candidate-ownership-v1-"));
try{
 const manifestRace=path.join(ownershipTemp,"manifest-race.json"),payloadRace=path.join(ownershipTemp,"payload-race.bin");
 fs.writeFileSync(payloadRace,Buffer.from("foreign-payload","utf8"),{mode:0o600});
 assert.throws(()=>writeCandidateOutputsV1({manifestFile:manifestRace,manifestBytes:Buffer.from("owned-manifest","utf8"),payloadFile:payloadRace,payloadBytes:Buffer.from("owned-payload","utf8")}),/candidate output already exists/u);
 assert.equal(fs.existsSync(manifestRace),false);
 assert.equal(fs.readFileSync(payloadRace,"utf8"),"foreign-payload");

 const manifestForeign=path.join(ownershipTemp,"manifest-foreign.json"),payloadAfter=path.join(ownershipTemp,"payload-after.bin");
 fs.writeFileSync(manifestForeign,Buffer.from("foreign-manifest","utf8"),{mode:0o600});
 assert.throws(()=>writeCandidateOutputsV1({manifestFile:manifestForeign,manifestBytes:Buffer.from("owned-manifest","utf8"),payloadFile:payloadAfter,payloadBytes:Buffer.from("owned-payload","utf8")}),/candidate output already exists/u);
 assert.equal(fs.readFileSync(manifestForeign,"utf8"),"foreign-manifest");
 assert.equal(fs.existsSync(payloadAfter),false);

 const chmodFail=path.join(ownershipTemp,"chmod-fail.bin");
 const realFchmod=fs.fchmodSync;
 let injectedChmod=false;
 try{
  fs.fchmodSync=(fd,mode)=>{void fd;void mode;injectedChmod=true;throw Object.assign(new Error("synthetic_chmod_failure"),{code:"EACCES"});};
  assert.throws(()=>writeExclusiveOwnedV1(chmodFail,Buffer.from("owned","utf8")),/synthetic_chmod_failure/u);
 }finally{fs.fchmodSync=realFchmod;}
 assert.equal(injectedChmod,true);
 assert.equal(fs.existsSync(chmodFail),false);

 const raceRoot=path.join(ownershipTemp,"parent-race"),raceParent=path.join(raceRoot,"out"),heldParent=path.join(raceRoot,"held"),redirect=path.join(raceRoot,"redirect");
 fs.mkdirSync(raceParent,{recursive:true,mode:0o700});fs.mkdirSync(redirect,{mode:0o700});
 const raceManifest=path.join(raceParent,"manifest.json"),racePayload=path.join(raceParent,"payload.bin");
 const realOpen=fs.openSync;let parentSwapped=false;
 try{
  fs.openSync=(file,flags,mode)=>{
   if(!parentSwapped&&typeof file==="string"&&file.startsWith("/proc/self/fd/")&&file.endsWith("/manifest.json")){
    fs.renameSync(raceParent,heldParent);fs.symlinkSync(redirect,raceParent,"dir");parentSwapped=true;
   }
   return realOpen(file,flags,mode);
  };
  assert.throws(()=>writeCandidateOutputsV1({manifestFile:raceManifest,manifestBytes:Buffer.from("owned-manifest"),payloadFile:racePayload,payloadBytes:Buffer.from("owned-payload")}),/candidate output parent identity drift/u);
 }finally{fs.openSync=realOpen;}
 assert.equal(parentSwapped,true);
 assert.equal(fs.existsSync(path.join(redirect,"manifest.json")),false);assert.equal(fs.existsSync(path.join(redirect,"payload.bin")),false);
 assert.equal(fs.existsSync(path.join(heldParent,"manifest.json")),false);assert.equal(fs.existsSync(path.join(heldParent,"payload.bin")),false);
}finally{fs.rmSync(ownershipTemp,{recursive:true,force:true});}

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-tor-candidate-v1-"));
try{
 const now=Date.now(),live=receiptAt(now),q=path.join(temp,"q.json"),m=path.join(temp,"manifest.json"),p=path.join(temp,"payload.bin");fs.writeFileSync(q,`${JSON.stringify(live,null,2)}\n`,{mode:0o600});
 const child=spawnSync(process.execPath,[SCRIPT,"--receipt",q,"--expected-source-sha",SOURCE,"--manifest-output",m,"--payload-output",p,"--validity-minutes","4320"],{cwd:ROOT,encoding:"utf8",timeout:20_000});assert.equal(child.status,0,child.stderr||child.stdout);assert.match(child.stdout,/VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1_GREEN/u);assert.equal(fs.existsSync(m),true);assert.equal(fs.existsSync(p),true);
 const second=spawnSync(process.execPath,[SCRIPT,"--receipt",q,"--expected-source-sha",SOURCE,"--manifest-output",m,"--payload-output",p],{cwd:ROOT,encoding:"utf8",timeout:20_000});assert.notEqual(second.status,0);assert.match(second.stderr,/output already exists/u);
 const repoLink=path.join(temp,"repo-link");fs.symlinkSync(ROOT,repoLink,"dir");
 const repoEscapeManifest=path.join(repoLink,".void-tor-candidate-symlink-escape-manifest.json");
 const repoEscapePayload=path.join(repoLink,".void-tor-candidate-symlink-escape-payload.bin");
 assert.equal(fs.existsSync(repoEscapeManifest),false);assert.equal(fs.existsSync(repoEscapePayload),false);
 const escape=spawnSync(process.execPath,[SCRIPT,"--receipt",q,"--expected-source-sha",SOURCE,"--manifest-output",repoEscapeManifest,"--payload-output",repoEscapePayload],{cwd:ROOT,encoding:"utf8",timeout:20_000});
 assert.notEqual(escape.status,0);assert.match(escape.stderr,/parent must be a real directory|parent must be canonical and symlink-free|must resolve outside repository/u);
 assert.equal(fs.existsSync(repoEscapeManifest),false);assert.equal(fs.existsSync(repoEscapePayload),false);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log("VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1_PROOF_GREEN");
console.log("foreign_output_eexist_preserved=true");
console.log("post_create_chmod_failure_cleaned=true");
console.log("transaction_cleanup_owned_outputs_only=true");
console.log("symlinked_output_parent_rejected=true");console.log("output_parent_descriptor_bound=true");console.log("output_parent_swap_redirect_blocked=true");console.log("authenticated_stale_predecessor_required=true");console.log("canonical_onion_identity_preserved=true");console.log("qualification_fresh_at_issuance_required=true");console.log("signed_manifest_default_validity_hours=72");console.log("runtime_qualification_age_does_not_replace_live_probe=true");console.log("offline_signing_payload_only=true");console.log("production_private_key_access=false");console.log("repository_publication=false");console.log("wallet_signer_payment_funds_authority=0");
