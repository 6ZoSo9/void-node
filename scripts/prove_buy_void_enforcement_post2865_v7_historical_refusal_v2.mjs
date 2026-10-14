#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_post2865_candidate_v1.mjs";
const CANDIDATE_JSON="ops/security/buy-void-enforcement-post2865-candidate-v1.json";
const LOCK_PROOF="scripts/prove_buy_void_enforcement_post2865_lock_v1.mjs";
const LOCK_JSON="ops/security/buy-void-enforcement-post2865-lock-v1.json";
const V7_SOURCE="src/economic/buy_void_source_finality_generation_provenance_v7.ts";
const PREFLIGHT_SOURCE="src/economic/buy_void_source_finality_execution_preflight_v1.ts";
const V7_DELTA_PROOF="scripts/prove_buy_void_source_finality_v7_executable_delta_candidate_v1.mjs";
const V7_DELTA_WORKFLOW=".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml";

const FROZEN=Object.freeze({
  [CANDIDATE_PROOF]:"1e2eccad36b482c2bc72cd82a7432f677d251571",
  [CANDIDATE_JSON]:"e85ec223ccb5babcc834a300e1be5abc315626dd",
  [LOCK_PROOF]:"9ba14ccacca6c1e5ccb4204b58ffd3ef46800712",
  [LOCK_JSON]:"37210b74fa0de86250af84ec088c2d74e9e90499",
});
const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=(bytes)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");

function read(relative,maximum=4*1024*1024){
  const absolute=path.join(ROOT,...relative.split("/"));
  const st=fs.lstatSync(absolute);
  assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size>0&&st.size<=maximum);
  const bytes=fs.readFileSync(absolute);
  assert.equal(bytes.length,st.size);
  return bytes;
}
for(const [relative,expected] of Object.entries(FROZEN)){
  assert.equal(gitBlob(read(relative)),expected,"frozen evidence drift:"+relative);
}
const v7Bytes=read(V7_SOURCE,2*1024*1024);
const preflightBytes=read(PREFLIGHT_SOURCE,2*1024*1024);
assert.match(v7Bytes.toString("utf8"),/VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7/u);
assert.match(preflightBytes.toString("utf8"),/observeBuyVoidSourceFinalityGenerationProvenanceV7/u);
assert.ok(fs.existsSync(path.join(ROOT,...V7_DELTA_PROOF.split("/"))));
assert.ok(fs.existsSync(path.join(ROOT,...V7_DELTA_WORKFLOW.split("/"))));

const args=process.argv.slice(2);
const index=args.indexOf("--provider-lock-receipt");
assert.ok(index>=0&&args[index+1],"provider lock receipt required");
const providerReceipt=path.resolve(args[index+1]);
const providerBytes=fs.readFileSync(providerReceipt);
assert.ok(providerBytes.length>0&&providerBytes.length<128*1024);
const provider=JSON.parse(providerBytes.toString("utf8"));
assert.equal(
  provider.marker,
  "VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_POST2865_LOCK_V1",
);
assert.equal(provider.provider_closure_identity_accepted,true);

const child=spawnSync(
  process.execPath,
  [
    path.join(ROOT,...CANDIDATE_PROOF.split("/")),
    "--derive",
    "--provider-lock-receipt",
    providerReceipt,
  ],
  {
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:30_000,
    maxBuffer:4*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      TZ:"UTC",
    },
  },
);
assert.equal(child.error,undefined);
assert.notEqual(child.status,0,"frozen post-2865 candidate unexpectedly accepted V7 generation");
const output=String(child.stdout||"")+"\n"+String(child.stderr||"");
assert.match(
  output,
  /artifact_(?:bytes|sha256):dist\/economic\/buy_void_source_finality_execution_preflight_v1[.]js/u,
);

const receipt=Object.freeze({
  schema:"void_buy_void_enforcement_post2865_v7_historical_refusal_v2",
  marker:"VOID_BUY_VOID_ENFORCEMENT_POST2865_V7_HISTORICAL_REFUSAL_V2",
  version:2,
  repository:"6ZoSo9/void-node",
  frozen_candidate_proof_git_blob_sha1:FROZEN[CANDIDATE_PROOF],
  frozen_candidate_json_git_blob_sha1:FROZEN[CANDIDATE_JSON],
  frozen_lock_proof_git_blob_sha1:FROZEN[LOCK_PROOF],
  frozen_lock_json_git_blob_sha1:FROZEN[LOCK_JSON],
  provider_lock_receipt_sha256:sha256(providerBytes),
  v7_source_git_blob_sha1:gitBlob(v7Bytes),
  preflight_source_git_blob_sha1:gitBlob(preflightBytes),
  frozen_candidate_refuses_v7_generation:true,
  frozen_candidate_bytes_unchanged:true,
  frozen_lock_bytes_unchanged:true,
  current_v7_delta_candidate_required:true,
  complete_executable_closure_verified:false,
  candidate_enforcement_identity_accepted:false,
  deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
});
process.stdout.write(JSON.stringify(receipt,null,2)+"\n");
