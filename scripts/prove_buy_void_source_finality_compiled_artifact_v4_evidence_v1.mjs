import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = "docs/architecture/buy-void-source-finality-compiled-artifact-v4-candidate-evidence-v1.json";
const EXPECTED_MANIFEST_BLOB = "4a97da9816ca28bc107822a32cd7ada42bdf5540";
const EXPECTED_GENERATION = "7e767d9e8977052220c60ab1e0e4c6411259aa3cfeadb7f073270ce4d2d7af06";
const SOURCE_STACK_HEAD = "4423740a1bbcc1f08bed7b3ce83d18d8b2b5c92c";
const SOURCE_V6_BLOB = "7266c03d8874207ed3fda0f814d0a7a53d429c25";
const SOURCE_V2_BLOB = "c77bb6144b27eb8fdaff168200cea24d9c0ee9ac";
const V3_BLOB = "d6e97784c5d8be93713e733628c7d1ef746bb5c7";
const V3_GENERATION = "0d36d26176a58cc24c2841c4363382749ccdcb2a93563989c27de36060354add";
const EXPECTED_ARTIFACTS = Object.freeze([
  {path:"dist/economic/buy_void_source_finality_generation_provenance_v6.js",bytes:15937,sha256:"2f4af845031530ca3bad0fa3c17512cf659219b32aa0137f58c48d242bf84b5a"},
  {path:"dist/economic/buy_void_source_finality_authenticated_composition_v3.js",bytes:18892,sha256:"0d023868f4a4ab95fe1276c8d1a7e891dd5c419844e0ed2aac8d3bce15b72f42"},
  {path:"dist/economic/buy_void_source_finality_authority_v2.js",bytes:19002,sha256:"239bfb3a8c0d2fa986986e961512660c6212818aa5769753d90f592490502c4b"},
  {path:"dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",bytes:19804,sha256:"3c5bb3d9952d1b5a537e74ebb759320d1c134c6a9b49dd242edb41c23cab7fe2"},
  {path:"dist/economic/buy_void_payment_rpc_observer_v1.js",bytes:12270,sha256:"d8ed50dc2f68947f2a9c0758e0f4fa2ab3b4bb368f4f5f851d3b0984c3012b89"},
  {path:"dist/economic/buy_void_verified_payment_v2.js",bytes:12161,sha256:"7d419bafa54c5a004416e224ee03131455a073600ca2c8d423d9fa40ab431ef2"}
]);
const PREDECESSOR_SHARED = EXPECTED_ARTIFACTS.slice(1,5);
const MAX_READ = 16 * 1024 * 1024;

function digest(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function gitBlob(bytes) {
  return crypto.createHash("sha1").update(Buffer.from("blob " + bytes.length + "\0")).update(bytes).digest("hex");
}
function sameIdentity(a,b) {
  return a.dev===b.dev && a.ino===b.ino && a.mode===b.mode &&
    a.nlink===b.nlink && a.size===b.size &&
    a.mtimeMs===b.mtimeMs && a.ctimeMs===b.ctimeMs;
}
function pinned(root, relative, max=2*1024*1024) {
  assert.ok(Number.isSafeInteger(max) && max>0 && max<=MAX_READ, "read_limit_invalid");
  assert.ok(!relative.includes("..") && !path.isAbsolute(relative), "path_outside_closed_root");
  const nofollow = fs.constants.O_NOFOLLOW;
  assert.ok(typeof nofollow==="number" && nofollow>0, "nofollow_unavailable");
  const absolute = path.join(root, relative);
  let fd;
  try {
    const visible = fs.lstatSync(absolute);
    assert.ok(visible.isFile() && !visible.isSymbolicLink() &&
      visible.nlink===1 && visible.size>0 && visible.size<=max, "visible_source_invalid");
    fd=fs.openSync(absolute,fs.constants.O_RDONLY|nofollow);
    const before=fs.fstatSync(fd);
    assert.ok(before.isFile() && before.nlink===1 &&
      before.size>0 && before.size<=max, "descriptor_invalid");
    assert.ok(sameIdentity(before,visible),"path_fd_drift_before");
    const buffer=Buffer.alloc(before.size+1);
    let total=0;
    while(total<buffer.length){
      const consumed=fs.readSync(fd,buffer,total,buffer.length-total,total);
      if(consumed===0)break;
      total+=consumed;
    }
    assert.equal(total,before.size,"unexpected_source_growth_or_truncation");
    const after=fs.fstatSync(fd);
    assert.ok(sameIdentity(before,after),"descriptor_changed_after");
    const visibleAfter=fs.lstatSync(absolute);
    assert.ok(visibleAfter.isFile() && !visibleAfter.isSymbolicLink() &&
      sameIdentity(visibleAfter,after),"visible_path_changed_after");
    return buffer.subarray(0,total);
  } finally { if(fd!==undefined)fs.closeSync(fd); }
}
function canonical(value) {
  if(value===null)return "null";
  if(typeof value==="string" || typeof value==="boolean")return JSON.stringify(value);
  if(typeof value==="number") { assert.ok(Number.isSafeInteger(value));return String(value); }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  assert.ok(value && typeof value==="object");
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
}
function validateCandidate(c) {
  assert.equal(c.schema,"void_buy_void_source_finality_compiled_artifact_attestation_v4");
  assert.equal(c.marker,"VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V4");
  assert.equal(c.repository,"6ZoSo9/void-node");
  assert.equal(c.version,4);
  assert.equal(c.source_stack_head,SOURCE_STACK_HEAD);
  assert.equal(c.predecessor.marker,"VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V3");
  assert.equal(c.predecessor.manifest_path,"docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v3.json");
  assert.equal(c.predecessor.manifest_git_blob_sha1,V3_BLOB);
  assert.equal(c.predecessor.compiled_artifact_generation_sha256,V3_GENERATION);
  assert.equal(c.compiler.typescript_version,"5.9.3");
  assert.equal(c.compiler.package_lock_git_blob_sha1,"b2671f0149f522b2489247016df0a5ec4bb72b8b");
  assert.equal(c.build.command,"npm run build");
  assert.equal(c.build.package_json_git_blob_sha1,"f28c3e9446c7623ef203da36a9642d046e5f34ee");
  assert.equal(c.build.tsconfig_build_git_blob_sha1,"d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb");
  assert.equal(c.build.source_finality_sources_changed,true);
  assert.equal(c.build.change_reason,"native_usdc_checkout_token_binding_and_source_finality_v6");
  assert.deepEqual(c.build.changed_source_paths,[
    "src/economic/buy_void_source_finality_generation_provenance_v6.ts",
    "src/economic/buy_void_verified_payment_v2.ts"
  ]);
  assert.equal(c.reviewed_source_generation.marker,"VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6");
  assert.equal(c.reviewed_source_generation.reviewed_source_files_sha256,"95cf8959cfef04accc4715cb310f9b975f1011d27bf9ef0b0d7aefaaeb17a426");
  assert.equal(c.reviewed_source_generation.verified_source_file_count,5);
  assert.equal(c.entry_artifact,EXPECTED_ARTIFACTS[0].path);
  assert.equal(c.artifact_count,EXPECTED_ARTIFACTS.length);
  assert.deepEqual(c.artifacts,EXPECTED_ARTIFACTS);
  assert.deepEqual(c.predecessor_unchanged_artifact_paths,PREDECESSOR_SHARED.map(a=>a.path));
  assert.deepEqual(c.changed_artifact_paths,[EXPECTED_ARTIFACTS[0].path,EXPECTED_ARTIFACTS[5].path]);
  assert.equal(c.predecessor_common_artifact_bytes_match,true);
  assert.equal(c.verified_payment_v2_source_git_blob_sha1,SOURCE_V2_BLOB);
  assert.equal(c.reviewed_source_finality_v6_source_git_blob_sha1,SOURCE_V6_BLOB);
  assert.equal(c.verified_payment_v2_artifact_sha256,EXPECTED_ARTIFACTS[5].sha256);
  assert.deepEqual(c.derivation_node_majors,[22,24,26]);
  assert.equal(c.compiled_artifact_generation_verified,false);
  assert.equal(c.deployed_artifact_generation_verified,false);
  assert.equal(c.runtime_mount_authority,false);
  assert.equal(c.production_source_finality_authority_ready,false);
  assert.equal(c.compiled_artifact_generation_sha256,EXPECTED_GENERATION);
  const derived={
    marker:c.marker,
    source_stack_head:c.source_stack_head,
    typescript_version:c.compiler.typescript_version,
    reviewed_source_files_sha256_v6:c.reviewed_source_generation.reviewed_source_files_sha256,
    artifacts:c.artifacts
  };
  assert.equal(digest(Buffer.from(canonical(derived),"utf8")),EXPECTED_GENERATION,
    "independent_compiled_generation_digest");
}
const args=process.argv.slice(2);
assert.ok(args.length<=1 && (args.length===0 || args[0].startsWith("--artifact-root=")),
  "only_optional_artifact_root_allowed");
const artifactRoot = args.length ? path.resolve(args[0].slice("--artifact-root=".length)) : ROOT;
const raw=pinned(ROOT,MANIFEST,64*1024);
assert.equal(raw.length,4032);
assert.equal(gitBlob(raw),EXPECTED_MANIFEST_BLOB);
const c=JSON.parse(raw.toString("utf8"));
assert.equal(Buffer.from(JSON.stringify(c,null,2)+"\n").equals(raw),true);
validateCandidate(c);

// Independently compare the exact archived six compiler outputs to a fresh
// build, rather than accepting the derivation tool's assertion.
for(const a of EXPECTED_ARTIFACTS) {
  const data=pinned(artifactRoot,a.path);
  assert.equal(data.length,a.bytes,"bytes_drift:"+a.path);
  assert.equal(digest(data),a.sha256,"compiled_identity_drift:"+a.path);
  const altered=Buffer.from(data);altered[0]^=1;
  assert.notEqual(digest(altered),a.sha256,"mutated_artifact_must_hold:"+a.path);
}
for(const [file,expected] of [
  ["src/economic/buy_void_source_finality_generation_provenance_v6.ts",SOURCE_V6_BLOB],
  ["src/economic/buy_void_verified_payment_v2.ts",SOURCE_V2_BLOB],
  ["package.json","f28c3e9446c7623ef203da36a9642d046e5f34ee"],
  ["package-lock.json","b2671f0149f522b2489247016df0a5ec4bb72b8b"],
  ["tsconfig.build.json","d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb"]
])assert.equal(gitBlob(pinned(ROOT,file,file==="package-lock.json"?16*1024*1024:2*1024*1024)),expected,
  "source_or_build_blob_drift:"+file);
const prevBytes=pinned(ROOT,c.predecessor.manifest_path,64*1024);
assert.equal(gitBlob(prevBytes),V3_BLOB);
const prev=JSON.parse(prevBytes.toString("utf8"));
assert.equal(prev.compiled_artifact_generation_sha256,V3_GENERATION);
for(const a of PREDECESSOR_SHARED){
  assert.deepEqual(prev.artifacts.find(r=>r.path===a.path),a,
    "historic_common_artifact_drift:"+a.path);
}
// Check source ancestry and ensure no reviewed runtime sources or compiler
// inputs changed after the exact last V6 source-edit commit.
execFileSync("git",["merge-base","--is-ancestor",SOURCE_STACK_HEAD,"HEAD"],{cwd:ROOT,stdio:"ignore"});
execFileSync("git",["diff","--quiet",SOURCE_STACK_HEAD,"HEAD","--",
  "src/economic/buy_void_source_finality_generation_provenance_v6.ts",
  "src/economic/buy_void_verified_payment_v2.ts",
  "src/economic/buy_void_source_finality_authenticated_composition_v3.ts",
  "src/economic/buy_void_source_finality_authority_v2.ts",
  "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts",
  "src/economic/buy_void_payment_rpc_observer_v1.ts",
  "package.json","package-lock.json","tsconfig.build.json",
  "scripts/copy_void_runtime_js_v1.mjs","scripts/retire_saveblock_periodic_rewriters_v1.mjs"
],{cwd:ROOT,stdio:"ignore"});
const mutant=(edit,label)=>{const v=structuredClone(c);edit(v);assert.throws(()=>validateCandidate(v),undefined,label);};
mutant(v=>{v.artifacts[0].sha256="0".repeat(64);},"compiled hash forgery");
mutant(v=>{v.artifacts[1].bytes+=1;},"predecessor compiled bytes forgery");
mutant(v=>{v.artifacts.push({...v.artifacts[0]});},"extra compiled artifact");
mutant(v=>{v.compiled_artifact_generation_verified=true;},"false acceptance promotion");
mutant(v=>{v.production_source_finality_authority_ready=true;},"production promotion");
mutant(v=>{v.predecessor.manifest_git_blob_sha1="0".repeat(40);},"historic manifest rewrite");
mutant(v=>{v.reviewed_source_finality_v6_source_git_blob_sha1="0".repeat(40);},"source identity rewrite");
mutant(v=>{v.compiled_artifact_generation_sha256="0".repeat(64);},"generation digest rewrite");

console.log("VOID_BUY_VOID_V4_SIX_ARTIFACT_EVIDENCE_INDEPENDENT_REVIEW_GREEN");
console.log("reviewed_artifact_count=6");
console.log("manifest_bytes=4032");
console.log("candidate_manifest_sha256="+EXPECTED_MANIFEST_SHA256);
console.log("candidate_generation_sha256="+EXPECTED_GENERATION);
console.log("pinned_artifact_root="+(artifactRoot===ROOT?"fresh_workspace_build":"stopped_image_copy"));
console.log("mutated_evidence_rejected=8");
console.log("compiled_artifact_generation_verified=false");
console.log("deployed_artifact_generation_verified=false");
console.log("production_source_finality_authority_ready=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
