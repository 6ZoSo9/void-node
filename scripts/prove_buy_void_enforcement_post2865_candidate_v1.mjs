#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import {
  canonicalJson,
  collectReviewedNodePackageRuntimeV1,
  verifyReviewedNodePackageRuntimeV1,
} from "../tools/void-reviewed-node-package-runtime-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const PACKAGE_MANIFEST="ops/security/reviewed-node-package-runtime-enforcement-post2865-v1.json";
const PACKAGE_MANIFEST_BLOB="445bcfbf5feae928e0d9cc06d4d31c1ee186fe39";
const PACKAGE_TOOL="tools/void-reviewed-node-package-runtime-v1.mjs";
const PACKAGE_TOOL_BLOB="6475c3f18ffe566cf5f448ca1de4795391a6efde";
const PROVIDER_EVIDENCE=
  "ops/security/buy-void-delivery-dependency-provider-closure-post2865-v1.json";
const PROVIDER_EVIDENCE_BLOB="b08c03912e0f66742f06f314bf5e1f5cad81f20f";
const PROVIDER_LOCK=
  "scripts/prove_buy_void_delivery_dependency_provider_closure_post2865_lock_v1.mjs";
const PROVIDER_LOCK_BLOB="39f660e23f5baa3f0a4f1e5b8b40c756c31da4cb";
const BUILD_EQUIVALENCE=
  "scripts/prove_buy_void_source_finality_dependency_build_equivalence_v1.mjs";
const BUILD_EQUIVALENCE_BLOB="ece0f4d41c2626cc04cb4e0c1c2e69146c016f85";
const SAGA_SOURCE="tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const SAGA_SOURCE_BLOB="d6a2d1cd82e5e255f435c1e21d1783774a44b2b1";
const SAGA_SHA256="e94b2c5c2da0a4849acab936d0d7f8710f2d2229909d73bc679a83c63f777e01";
const IMPORTER="dist/economic/buy_void_erc20_execution_composition_v1.js";
const TOOL_SPEC="../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const REVIEWED_ARTIFACTS=Object.freeze([{"path":"dist/economic/buy_void_auto_fulfillment_v1.js","bytes":26226,"sha256":"119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c"},{"path":"dist/economic/buy_void_broadcast_outcome_journal_v1.js","bytes":26632,"sha256":"543a98203719f27bd854aaeb119eec4c216e1ebbbb9c258b667f1fccc97a7d84"},{"path":"dist/economic/buy_void_confirmed_state_journal_v1.js","bytes":28090,"sha256":"1ce1dbfc9d1c835c2cf6b6eee16021089984d0f03e17215e8e767d4061937bda"},{"path":"dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js","bytes":21165,"sha256":"0b4dd188dbbf7658542b1d20c521227fa1fc01d7d79e89a713863b771380da13"},{"path":"dist/economic/buy_void_delivery_runtime_integration_v1.js","bytes":17043,"sha256":"c6897d1abcaa680ae8f18d0a8311d87532385ed30fda99f32f850f554cde2421"},{"path":"dist/economic/buy_void_delivery_sign_broadcast_adapter_v1.js","bytes":28661,"sha256":"0d8dff6b431ce06883c4240bfb7f5828817bec9685a590f34f60fcc10b47611a"},{"path":"dist/economic/buy_void_delivery_submission_guard_v1.js","bytes":18457,"sha256":"b3006f5a93bc982721d1d4b25274a129dd548486fccc2788b7f4ffd939536132"},{"path":"dist/economic/buy_void_erc20_delivery_receipt_reconciler_v1.js","bytes":32599,"sha256":"afbe014c75016002a7c8ea795b6198fde4f92efb97571c41f636aa2ec4424c06"},{"path":"dist/economic/buy_void_erc20_execution_composition_v1.js","bytes":86455,"sha256":"b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1"},{"path":"dist/economic/buy_void_erc20_transaction_preparation_planner_v1.js","bytes":25200,"sha256":"7a9a8a3cf00e732b2b3860736c5cb72ed2c1c0166652b1f896c5d8abd6dc6e2f"},{"path":"dist/economic/buy_void_execution_attempt_journal_v1.js","bytes":45799,"sha256":"702a78268feccae68c58f1d06b96dc10cc392aa00f245d14e6ce3c1a24a06f8d"},{"path":"dist/economic/buy_void_filesystem_bakery_lock_v1.js","bytes":18455,"sha256":"47e80dfffa0cd1fd97169f9d63e836c9dbf52461aaafafdf10499b5cf91fd3ca"},{"path":"dist/economic/buy_void_fulfillment_confirmation_v1.js","bytes":12974,"sha256":"95ca340f09042788e49210b5ed6f96d773b398fd04ec88efa46f29398939e5f1"},{"path":"dist/economic/buy_void_fulfillment_journal_v1.js","bytes":26578,"sha256":"72f0024ea3d480b6222afdc7d0bcc9b99f3be4d3512706944afd9505fa1c8fc0"},{"path":"dist/economic/buy_void_inventory_reservation_journal_v1.js","bytes":36503,"sha256":"891036f36df7c8b176ae560185fde1df4438338129999afb6c9eb0151c45de71"},{"path":"dist/economic/buy_void_payment_rpc_observer_v1.js","bytes":15167,"sha256":"9f4f5ee85972777e639dea89abf0c8337576525335ed982be3eb1bfe86c93db3"},{"path":"dist/economic/buy_void_pipeline_coordinator_v1.js","bytes":19263,"sha256":"cd414640dc8388049a808f015ed05cc2c25e2ebaa9fd62058b2c23fe7ffc52a6"},{"path":"dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js","bytes":19804,"sha256":"3c5bb3d9952d1b5a537e74ebb759320d1c134c6a9b49dd242edb41c23cab7fe2"},{"path":"dist/economic/buy_void_source_finality_authenticated_composition_v3.js","bytes":18892,"sha256":"0d023868f4a4ab95fe1276c8d1a7e891dd5c419844e0ed2aac8d3bce15b72f42"},{"path":"dist/economic/buy_void_source_finality_authority_v2.js","bytes":19002,"sha256":"239bfb3a8c0d2fa986986e961512660c6212818aa5769753d90f592490502c4b"},{"path":"dist/economic/buy_void_source_finality_execution_preflight_v1.js","bytes":21997,"sha256":"8045a382c34ccb1309319a2eaaa877255e9aff48aa27bdf38c180913a7f8f739"},{"path":"dist/economic/buy_void_source_finality_generation_provenance_v6.js","bytes":15937,"sha256":"1994ebb8ca3b6152a44fc5527f120f418c48f6c262911e4f0e9c9d54aee87fec"},{"path":"dist/economic/buy_void_verified_payment_v2.js","bytes":19594,"sha256":"619177302a195bacd424c9e49f93b15108946fa52cc5b1b4c15829ac32f5c2e6"}]);
const REVIEWED_PRE2865_RECEIPT=Object.freeze({
  workflow_run:38486514781,
  head:"21773007311f63c7a2e5d288e8bfa1e2243d49b6",
  candidate_json_sha256:
    "f3680f613095054be2699fefe6d1f11dc03eda725d930254d2a045462bf4646e",
  candidate_enforcement_set_sha256:
    "43a1a3cbec71f59e0c33216afe5e5b826e119e95aa14acfd2bc2d8b2c238a297",
});
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function read(relative,max=4*1024*1024){
  assert.ok(!path.isAbsolute(relative)&&!relative.split("/").includes(".."));
  const absolute=path.join(ROOT,relative);
  const st=fs.lstatSync(absolute);
  assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&
    st.size>0&&st.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  assert.equal(bytes.length,st.size,"short_read:"+relative);
  return bytes;
}
function pin(relative,expected,max){
  const bytes=read(relative,max);
  assert.equal(gitBlob(bytes),expected,"git_blob_drift:"+relative);
  return bytes;
}
function packageIdentity(){
  pin(PACKAGE_TOOL,PACKAGE_TOOL_BLOB,128*1024);
  const manifestBytes=pin(PACKAGE_MANIFEST,PACKAGE_MANIFEST_BLOB,128*1024);
  const manifest=JSON.parse(manifestBytes.toString("utf8"));
  assert.equal(manifest.profile_identity_accepted,true);
  assert.deepEqual(manifest.root_packages,["ethers","express"]);
  assert.equal(manifest.package_json_git_blob_sha1,
    "14fbdf5717b07fd4c734f5da7a8e84ed59bee93f");
  assert.equal(manifest.package_lock_git_blob_sha1,
    "15b5c82ea36f13079a2f9e8863722f654eb3f201");
  const profile=collectReviewedNodePackageRuntimeV1({
    rootPackages:["ethers","express"],
  });
  assert.equal(profile.profile_id,manifest.profile_id);
  assert.equal(profile.packages_aggregate_sha256,manifest.packages_aggregate_sha256);
  assert.equal(profile.package_count,82);
  assert.equal(profile.total_file_count,2498);
  assert.equal(profile.total_bytes,21290060);
  assert.equal(
    sha256(Buffer.from(canonicalJson(profile),"utf8")),
    manifest.profile_canonical_sha256,
  );
  const verified=verifyReviewedNodePackageRuntimeV1({profile});
  assert.equal(verified.ok,true);
  return manifest;
}
function providerIdentity(receiptPath){
  pin(PROVIDER_EVIDENCE,PROVIDER_EVIDENCE_BLOB,512*1024);
  pin(PROVIDER_LOCK,PROVIDER_LOCK_BLOB,512*1024);
  const bytes=fs.readFileSync(path.resolve(receiptPath));
  assert.ok(bytes.length>0&&bytes.length<128*1024);
  const r=JSON.parse(bytes.toString("utf8"));
  assert.equal(r.marker,
    "VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_POST2865_LOCK_V1");
  assert.equal(r.candidate_json_sha256,
    "6c2bfe62b0d669bc9794a13eb24d357026ca8f9f7c055af1bcc0c0893c94247b");
  assert.equal(r.provider_closure_sha256,
    "3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945");
  assert.equal(r.provider_closure_semantic_sha256,
    "95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384");
  assert.equal(r.provider_closure_identity_accepted,true);
  assert.equal(r.current_descendant_semantics_requalified,true);
  assert.equal(r.whole_enforcement_closure_verified,false);
  assert.equal(r.production_source_finality_authority_ready,false);
  assert.equal(r.funds_movement,false);
  return r;
}
function artifactIdentity(){
  assert.equal(REVIEWED_ARTIFACTS.length,23);
  for(const row of REVIEWED_ARTIFACTS){
    const bytes=read(row.path,2*1024*1024);
    assert.equal(bytes.length,row.bytes,"artifact_bytes:"+row.path);
    assert.equal(sha256(bytes),row.sha256,"artifact_sha256:"+row.path);
  }
}
function sourceFinalityGeneration(){
  pin(BUILD_EQUIVALENCE,BUILD_EQUIVALENCE_BLOB,512*1024);
  const sourceFinalityArtifactOrder=[
    "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
    "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
    "dist/economic/buy_void_source_finality_authority_v2.js",
    "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
    "dist/economic/buy_void_payment_rpc_observer_v1.js",
    "dist/economic/buy_void_verified_payment_v2.js",
  ];
  const byPath=new Map(REVIEWED_ARTIFACTS.map(row=>[row.path,row]));
  const rows=sourceFinalityArtifactOrder.map(relative=>{
    const row=byPath.get(relative);
    assert.ok(row,"missing source-finality artifact:"+relative);
    return row;
  });
  assert.equal(rows.length,6);
  const generation=sha256(Buffer.from(canonical({
    marker:"VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V5",
    source_stack_head:"22a30e3ffad6047a472488104c769140bd050878",
    typescript_version:"5.9.3",
    reviewed_source_files_sha256_v6:
      "35691ec1fe0c19f08e9d1c256ce160c1f47139877832b97c0686d93ab42560f8",
    artifacts:rows,
  }),"utf8"));
  assert.equal(generation,
    "18758f6563f9a96aea0d55e293a4c10da8de349ba12ecc90fdebd82f486b944c");
  return generation;
}
function extractSagaFactory(compiled){
  const ast=ts.createSourceFile(IMPORTER,compiled.toString("utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length,0);
  const found=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&
    n.name?.text==="defaultSagaModule");
  assert.equal(found.length,1);
  const fn=found[0];
  assert.ok(fn.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword));
  assert.equal(fn.parameters.length,0);
  assert.equal(fn.body?.statements.length,2);
  const [first,second]=fn.body.statements;
  assert.ok(ts.isVariableStatement(first)&&first.declarationList.declarations.length===1);
  const d=first.declarationList.declarations[0];
  assert.ok(ts.isIdentifier(d.name)&&d.name.text==="dynamicImport"&&d.initializer&&
    ts.isNewExpression(d.initializer)&&ts.isIdentifier(d.initializer.expression)&&
    d.initializer.expression.text==="Function");
  const args=d.initializer.arguments||[];
  assert.equal(args.length,2);
  assert.ok(args.every(ts.isStringLiteral));
  assert.deepEqual(args.map(x=>x.text),["specifier","return import(specifier)"]);
  assert.ok(ts.isReturnStatement(second)&&second.expression&&
    ts.isCallExpression(second.expression)&&
    ts.isIdentifier(second.expression.expression)&&
    second.expression.expression.text==="dynamicImport"&&
    second.expression.arguments.length===1&&
    ts.isStringLiteral(second.expression.arguments[0])&&
    second.expression.arguments[0].text===TOOL_SPEC);
  return fn.getText(ast);
}
function sagaEdge(){
  const saga=pin(SAGA_SOURCE,SAGA_SOURCE_BLOB,128*1024);
  assert.equal(sha256(saga),SAGA_SHA256);
  const compiled=read(IMPORTER,2*1024*1024);
  const factory=extractSagaFactory(compiled);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-enforcement-saga-edge-"));
  try{
    const dist=path.join(tmp,"dist","economic");
    const tools=path.join(tmp,"tools");
    fs.mkdirSync(dist,{recursive:true,mode:0o700});
    fs.mkdirSync(tools,{recursive:true,mode:0o700});
    fs.writeFileSync(path.join(tools,path.basename(SAGA_SOURCE)),saga,{mode:0o400});
    const entry=path.join(dist,"factory.mjs");
    fs.writeFileSync(entry,[
      factory,
      "const m=await defaultSagaModule();",
      'console.log(JSON.stringify({marker:m.MARKER,authority:m.AUTHORITY,exports:Object.keys(m).sort()}));',
      "",
    ].join("\n"),{mode:0o400});
    const child=spawnSync(process.execPath,[
      "--permission","--allow-fs-read="+tmp,entry,
    ],{
      cwd:tmp,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:20_000,
      env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC"},
    });
    assert.equal(child.status,0,String(child.stderr||""));
    const out=JSON.parse(String(child.stdout||"").trim());
    assert.equal(out.marker,"VOID_BUY_VOID_CRASH_CONSISTENT_FULFILLMENT_SAGA_V1");
    for(const key of ["startup_execution","network_request","credential_access",
      "wallet_access","signing","transaction_broadcast","money_movement"]){
      assert.equal(out.authority[key],false,key);
    }
  }finally{
    for(const p of [
      path.join(tmp,"dist","economic","factory.mjs"),
      path.join(tmp,"tools",path.basename(SAGA_SOURCE)),
    ]) if(fs.existsSync(p)) fs.chmodSync(p,0o600);
    fs.chmodSync(tmp,0o700);
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}
function derive(receiptPath){
  const pkg=packageIdentity();
  const provider=providerIdentity(receiptPath);
  artifactIdentity();
  const compiledGeneration=sourceFinalityGeneration();
  sagaEdge();
  const body={
    schema:"void_buy_void_enforcement_post2865_candidate_v1",
    marker:"VOID_BUY_VOID_ENFORCEMENT_POST2865_CANDIDATE_V1",
    version:1,
    repository:"6ZoSo9/void-node",
    reviewed_pre2865_receipt:REVIEWED_PRE2865_RECEIPT,
    audited_package_runtime:{
      manifest_git_blob_sha1:PACKAGE_MANIFEST_BLOB,
      profile_id:pkg.profile_id,
      packages_aggregate_sha256:pkg.packages_aggregate_sha256,
      profile_canonical_sha256:pkg.profile_canonical_sha256,
      root_packages:pkg.root_packages,
      profile_identity_accepted:true,
    },
    compiled_source_finality:{
      compiled_artifact_generation_sha256:compiledGeneration,
      audited_dependency_build_equivalence_bound:true,
      current_audited_build_matches_locked_artifacts:true,
      compiled_artifact_generation_verified:true,
    },
    delivery_runtime:{
      reviewed_artifact_count:REVIEWED_ARTIFACTS.length,
      current_audited_build_matches_reviewed_artifacts:true,
      dynamic_tool_candidate_count:1,
      dynamic_tool_execution_identity_verified:true,
      dynamic_tool_transitive_closure_verified:true,
      no_dynamic_unknown_imports:true,
    },
    dependency_provider:{
      lock_candidate_json_sha256:provider.candidate_json_sha256,
      provider_closure_sha256:provider.provider_closure_sha256,
      provider_closure_semantic_sha256:provider.provider_closure_semantic_sha256,
      provider_closure_identity_accepted:true,
      current_descendant_semantics_requalified:true,
      third_party_package_imports:["ethers"],
    },
    third_party_package_imports:["ethers","express"],
    package_runtime_identity_accepted:true,
    provider_closure_composed:true,
    delivery_route_closure_composed:true,
    third_party_package_runtime_closure_verified:true,
    complete_executable_closure_verified:true,
    candidate_enforcement_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  };
  return Object.freeze({...body,
    candidate_enforcement_set_sha256:sha256(Buffer.from(canonical(body),"utf8")),
  });
}
const args=process.argv.slice(2);
const ri=args.indexOf("--provider-lock-receipt");
assert.ok(ri>=0&&args[ri+1],"provider lock receipt required");
if(args.includes("--self-test")){
  const c=derive(args[ri+1]);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  console.log("VOID_BUY_VOID_ENFORCEMENT_POST2865_CANDIDATE_SELF_TEST_GREEN");
}else if(args.includes("--derive")){
  process.stdout.write(JSON.stringify(derive(args[ri+1]),null,2)+"\n");
}else{
  throw Error("post2865_enforcement_candidate_only_no_acceptance");
}
