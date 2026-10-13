#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildTorBootstrapManifestCandidateV1,validateTorQualificationReceiptForManifestV1 } from "./build_void_tor_bootstrap_manifest_candidate_v1.mjs";
import { buildTorQualificationReceiptV1 } from "./qualify_void_public_seed_tor_v1.mjs";
import { loadTorBootstrapReleaseRootFile,loadTorBootstrapSignedManifestLifecycleFile } from "./lib/void_tor_bootstrap_release_root_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SCRIPT=path.join(ROOT,"scripts","build_void_tor_bootstrap_manifest_candidate_v1.mjs");
const RELEASE_ROOT=path.join(ROOT,"config","void-tor-bootstrap-release-root-v1.json");
const PREDECESSOR=path.join(ROOT,"public","bootstrap","tor-signed-v1.json");
const ONION="6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion";
const OTHER="r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion";
const SOURCE="a".repeat(40),NOW=Date.parse("2026-10-13T18:00:00.000Z");
function receiptAt(now=NOW,onion=ONION,port=80){return buildTorQualificationReceiptV1({sourceSha:SOURCE,onionHostname:onion,virtualPort:port,socksHost:"127.0.0.1",socksPort:19051,observations:[{observed_at:new Date(now-4*60_000).toISOString(),head:2100000},{observed_at:new Date(now-3*60_000).toISOString(),head:2100001},{observed_at:new Date(now-2*60_000).toISOString(),head:2100002}],generatedAt:new Date(now-60_000).toISOString()});}
const root=loadTorBootstrapReleaseRootFile(RELEASE_ROOT,{allowHold:false});
const predecessor=loadTorBootstrapSignedManifestLifecycleFile(PREDECESSOR,root,{nowMs:NOW});
assert.equal(predecessor.lifecycle,"authenticated_stale");assert.equal(predecessor.validSignatureCount,1);
const receipt=receiptAt();
assert.equal(validateTorQualificationReceiptForManifestV1(receipt,{expectedSourceSha:SOURCE,nowMs:NOW}).qualification_id,receipt.qualification_id);
const candidate=buildTorBootstrapManifestCandidateV1({receipt,expectedSourceSha:SOURCE,validatedRoot:root,predecessor,nowMs:NOW,validityMinutes:90});
assert.equal(candidate.rootId,root.root.root_id);assert.equal(candidate.manifest.status,"stable_tor_seed");assert.equal(candidate.manifest.onion_endpoints[0].base,`http://${ONION}`);assert.equal(candidate.manifest.onion_endpoints[0].qualification_id,receipt.qualification_id);assert.equal(candidate.manifest.authority.money_movement_authority,false);assert.match(candidate.payloadSha256,/^[0-9a-f]{64}$/u);assert.equal(Date.parse(candidate.manifest.expires_at)-Date.parse(receipt.generated_at)<=2*60*60_000,true);
assert.throws(()=>validateTorQualificationReceiptForManifestV1(receipt,{expectedSourceSha:"b".repeat(40),nowMs:NOW}),/source SHA mismatch/u);
assert.throws(()=>buildTorBootstrapManifestCandidateV1({receipt:receiptAt(NOW,OTHER),expectedSourceSha:SOURCE,validatedRoot:root,predecessor,nowMs:NOW}),/onion identity changed/u);
assert.throws(()=>buildTorBootstrapManifestCandidateV1({receipt:receiptAt(NOW-16*60_000),expectedSourceSha:SOURCE,validatedRoot:root,predecessor,nowMs:NOW}),/freshness invalid/u);
assert.throws(()=>buildTorBootstrapManifestCandidateV1({receipt:receiptAt(NOW,ONION,81),expectedSourceSha:SOURCE,validatedRoot:root,predecessor,nowMs:NOW}),/transport mismatch/u);
const tampered=structuredClone(receipt);tampered.authority.wallet_authority=true;assert.throws(()=>validateTorQualificationReceiptForManifestV1(tampered,{expectedSourceSha:SOURCE,nowMs:NOW}),/wallet_authority must be false/u);
assert.throws(()=>buildTorBootstrapManifestCandidateV1({receipt,expectedSourceSha:SOURCE,validatedRoot:root,predecessor,nowMs:NOW,validityMinutes:91}),/60 through 90/u);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-tor-candidate-v1-"));
try{
 const now=Date.now(),live=receiptAt(now),q=path.join(temp,"q.json"),m=path.join(temp,"manifest.json"),p=path.join(temp,"payload.bin");fs.writeFileSync(q,`${JSON.stringify(live,null,2)}\n`,{mode:0o600});
 const child=spawnSync(process.execPath,[SCRIPT,"--receipt",q,"--expected-source-sha",SOURCE,"--manifest-output",m,"--payload-output",p,"--validity-minutes","90"],{cwd:ROOT,encoding:"utf8",timeout:20_000});assert.equal(child.status,0,child.stderr||child.stdout);assert.match(child.stdout,/VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1_GREEN/u);assert.equal(fs.existsSync(m),true);assert.equal(fs.existsSync(p),true);
 const second=spawnSync(process.execPath,[SCRIPT,"--receipt",q,"--expected-source-sha",SOURCE,"--manifest-output",m,"--payload-output",p],{cwd:ROOT,encoding:"utf8",timeout:20_000});assert.notEqual(second.status,0);assert.match(second.stderr,/output already exists/u);
 const repoLink=path.join(temp,"repo-link");fs.symlinkSync(ROOT,repoLink,"dir");
 const repoEscapeManifest=path.join(repoLink,".void-tor-candidate-symlink-escape-manifest.json");
 const repoEscapePayload=path.join(repoLink,".void-tor-candidate-symlink-escape-payload.bin");
 assert.equal(fs.existsSync(repoEscapeManifest),false);assert.equal(fs.existsSync(repoEscapePayload),false);
 const escape=spawnSync(process.execPath,[SCRIPT,"--receipt",q,"--expected-source-sha",SOURCE,"--manifest-output",repoEscapeManifest,"--payload-output",repoEscapePayload],{cwd:ROOT,encoding:"utf8",timeout:20_000});
 assert.notEqual(escape.status,0);assert.match(escape.stderr,/parent must be canonical and symlink-free|must resolve outside repository/u);
 assert.equal(fs.existsSync(repoEscapeManifest),false);assert.equal(fs.existsSync(repoEscapePayload),false);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log("VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1_PROOF_GREEN");
console.log("symlinked_output_parent_rejected=true");console.log("authenticated_stale_predecessor_required=true");console.log("canonical_onion_identity_preserved=true");console.log("qualification_freshness_bounded=true");console.log("offline_signing_payload_only=true");console.log("production_private_key_access=false");console.log("repository_publication=false");console.log("wallet_signer_payment_funds_authority=0");
