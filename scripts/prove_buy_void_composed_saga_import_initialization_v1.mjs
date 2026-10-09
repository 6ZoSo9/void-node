#!/usr/bin/env node
// Exact source-only import-initialization policy. NEVER import the real saga.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { readDescriptorRelativeLinuxV1 } from "./prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs";
import { runReviewedGitV1, proveReviewedGitV1Synthetic } from "./prove_buy_void_reviewed_git_invocation_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const PARENT="eeef850affd912a0d1e019bfac2d681b38ea24ed";
const SAGA="tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const SAGA_BLOB="d6a2d1cd82e5e255f435c1e21d1783774a44b2b1";
const DOCKER_BLOB="2acd9bcf0416eeb0f9fd72c1a556696863ff1607";
const SAGA_BYTES=58023;
const ALLOWED_IMPORTS=["node:crypto","node:fs","node:path"];
function sha256(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0")).update(bytes).digest("hex");
}
function auditSource(bytes) {
  const ast=ts.createSourceFile(SAGA,bytes.toString("utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length,0,"malformed saga JS");
  const refs=new Set(),imports=[],initialized={freeze:0,set:0,int32:0};
  let variables=0,functions=0;
  function safe(node){
    if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||
       ts.isNumericLiteral(node)||ts.isRegularExpressionLiteral(node)||
       node.kind===ts.SyntaxKind.TrueKeyword||
       node.kind===ts.SyntaxKind.FalseKeyword||
       node.kind===ts.SyntaxKind.NullKeyword) return;
    if(ts.isIdentifier(node)) {
      assert.ok(refs.has(node.text),"unreviewed top-level initializer identifier: "+node.text);
      return;
    }
    if(ts.isParenthesizedExpression(node))return safe(node.expression);
    if(ts.isPrefixUnaryExpression(node)) {
      assert.ok([ts.SyntaxKind.MinusToken,ts.SyntaxKind.PlusToken].includes(node.operator),
        "unreviewed top-level unary operation");
      return safe(node.operand);
    }
    if(ts.isBinaryExpression(node)){
      assert.ok([ts.SyntaxKind.PlusToken,ts.SyntaxKind.MinusToken,
        ts.SyntaxKind.AsteriskToken].includes(node.operatorToken.kind),
        "unreviewed top-level binary operation");
      safe(node.left);safe(node.right);return;
    }
    if(ts.isArrayLiteralExpression(node)){
      for(const item of node.elements){
        assert.ok(!ts.isSpreadElement(item),"spread evaluates arbitrary top-level code");
        safe(item);
      }
      return;
    }
    if(ts.isObjectLiteralExpression(node)){
      for(const property of node.properties){
        assert.ok(ts.isPropertyAssignment(property),"getter/spread/top-level method forbidden");
        assert.ok(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name),
          "computed top-level object key forbidden");
        assert.notEqual(property.name.text,"__proto__","dangerous top-level property");
        safe(property.initializer);
      }
      return;
    }
    if(ts.isCallExpression(node)){
      assert.equal(node.expression.getText(ast),"Object.freeze",
        "unreviewed top-level function call");
      assert.equal(node.arguments.length,1,"freeze must be unary");
      assert.ok(ts.isObjectLiteralExpression(node.arguments[0])||
        ts.isArrayLiteralExpression(node.arguments[0]),"freeze argument must be literal");
      initialized.freeze+=1;safe(node.arguments[0]);return;
    }
    if(ts.isNewExpression(node)){
      const callee=node.expression.getText(ast),args=node.arguments||[];
      if(callee==="Set"){
        assert.equal(args.length,1);
        assert.ok(ts.isArrayLiteralExpression(args[0]),"Set initializer not literal");
        initialized.set+=1;safe(args[0]);return;
      }
      if(callee==="Int32Array") {
        assert.equal(args.length,1);
        assert.ok(ts.isNewExpression(args[0])&&
          args[0].expression.getText(ast)==="SharedArrayBuffer",
          "top-level typed array must use fixed shared buffer");
        assert.equal(args[0].arguments?.length,1);
        assert.ok(ts.isNumericLiteral(args[0].arguments[0])&&
          args[0].arguments[0].text==="4","unexpected shared buffer size");
        initialized.int32+=1;return;
      }
      assert.fail("unreviewed top-level constructor: "+callee);
    }
    assert.fail("unreviewed top-level executable initializer syntax: "+
      ts.SyntaxKind[node.kind]);
  }
  for(const statement of ast.statements) {
    if(ts.isImportDeclaration(statement)) {
      assert.ok(ts.isStringLiteral(statement.moduleSpecifier),"unreviewed import specifier");
      imports.push(statement.moduleSpecifier.text);
      continue;
    }
    if(ts.isFunctionDeclaration(statement)) {
      assert.ok(statement.name&&statement.body,"unbound saga function declaration");
      functions+=1;continue;
    }
    if(ts.isVariableStatement(statement)) {
      assert.ok((statement.declarationList.flags&ts.NodeFlags.Const)!==0,
        "mutable top-level binding");
      for(const decl of statement.declarationList.declarations) {
        assert.ok(ts.isIdentifier(decl.name)&&decl.initializer,
          "destructured/uninitialized top-level binding");
        safe(decl.initializer);
        assert.ok(!refs.has(decl.name.text),"duplicate top-level binding");
        refs.add(decl.name.text);
        variables+=1;
      }
      continue;
    }
    assert.fail("unreviewed import-time statement: "+ts.SyntaxKind[statement.kind]);
  }
  assert.deepEqual(imports,ALLOWED_IMPORTS,"unreviewed saga top-level dependency");
  assert.equal(functions,50,"unexpected saga function declaration inventory");
  assert.equal(variables,32,"unexpected saga top-level immutable declaration inventory");
  assert.deepEqual(initialized,{freeze:3,set:1,int32:1},
    "unexpected saga top-level allocation/initializer inventory");
  return {imports,top_level_function_declarations:functions,
    top_level_const_declarations:variables,
    explicitly_reviewed_import_time_initializers:initialized};
}
function syntheticNegatives(){
  proveReviewedGitV1Synthetic();
  // Exercise EACH mutation on the EXACT reviewed source with its original
  // declaration counts/imports, so a negative cannot pass simply because
  // the synthetic test lacks the required three imports and 50 functions.
  const clean=readDescriptorRelativeLinuxV1(ROOT,SAGA,128*1024);
  assert.equal(clean.length,SAGA_BYTES);
  assert.equal(gitBlob(clean),SAGA_BLOB);
  const baseline=auditSource(clean);
  assert.equal(baseline.top_level_function_declarations,50);
  const mutations=[
    ['import "node:child_process";',/unreviewed saga top-level dependency/],
    ['const injected = fs.writeFileSync("/tmp/unreviewed", "bad");',/unreviewed top-level function call/],
    ['fs.writeFileSync("/tmp/unreviewed", "bad");',/unreviewed import-time statement/],
    ['const injected = await import("node:child_process");',/unreviewed top-level executable initializer syntax/],
    ['const injected = new Function("return 1");',/unreviewed top-level constructor/],
    ['const injected = globalThis["Function"];',/unreviewed top-level executable initializer syntax/],
    ['export const injected = Object.freeze({a: process.env.PRIVATE});',/unreviewed top-level executable initializer syntax/],
    ['const injected = (()=>console.log("bad"))();',/unreviewed top-level function call/],
    ['const injected = {get a(){return 1}};',/getter\/spread\/top-level method forbidden/],
    ['const injected = Object.freeze({...process.env});',/getter\/spread\/top-level method forbidden/],
    ['let injected = 1;',/mutable top-level binding/]
  ];
  for(const [attack,reason] of mutations){
    const changed=Buffer.concat([clean,Buffer.from("\n"+attack+"\n")]);
    assert.throws(()=>auditSource(changed),reason,
      "negative must be rejected by its own policy: "+attack);
  }
  assert.deepEqual(auditSource(Buffer.concat([clean,Buffer.from("\n//review-only\n")])),
    baseline,"nonexecuting comment must not change the AST assessment");
  console.log("VOID_BUY_VOID_SAGA_IMPORT_AST_NEGATIVES_GREEN");
  console.log("clean_reviewed_source_positive=true");
  console.log("injected_negative_cases="+mutations.length);
  console.log("unreviewed_top_level_side_effects_rejected=true");
  console.log("computed_or_dynamic_top_level_execution_rejected=true");
  console.log("actual_saga_imported_or_executed=false");
  console.log("production_source_finality_authority_ready=false");
}
function derive(){
  assert.equal(process.platform,"linux","Linux-only descriptor helper requires Linux");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])),
    "Node version outside reviewed source matrix");
  // Current-main composition may carry the exact reviewed source bytes
  // without making the historical component branch an ancestor. Bind the
  // historical parent tree directly, then bind the current files below.
  const parentTree=runReviewedGitV1(
    ["ls-tree",PARENT,"--",SAGA,"Dockerfile"],ROOT,
  );
  const parentBlobs=new Map(
    parentTree.trim().split("\n").filter(Boolean).map(line=>{
      const match=line.match(/^100644 blob ([0-9a-f]{40})\t(.+)$/u);
      assert.ok(match,"unexpected reviewed parent tree entry: "+line);
      return [match[2],match[1]];
    }),
  );
  assert.equal(parentBlobs.get(SAGA),SAGA_BLOB,
    "reviewed parent saga blob drift");
  assert.equal(parentBlobs.get("Dockerfile"),DOCKER_BLOB,
    "reviewed parent Dockerfile blob drift");
  const original=readDescriptorRelativeLinuxV1(ROOT,SAGA,128*1024);
  assert.equal(original.length,SAGA_BYTES,"saga source byte length drift");
  assert.equal(gitBlob(original),SAGA_BLOB,"reviewed saga source Git blob drift");
  const docker=readDescriptorRelativeLinuxV1(ROOT,"Dockerfile",128*1024);
  assert.equal(gitBlob(docker),DOCKER_BLOB,"stopped-image Dockerfile source drift");
  assert.ok(docker.toString().includes(
    "COPY --from=build /app/tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs ./tools/"),
    "reviewed saga packaging source line missing");
  const census=auditSource(original);
  return {schema:"void_buy_void_composed_saga_import_initialization_candidate_v1",version:1,
    exact_source_parent:PARENT,
    reviewed_parent_tree_identity_verified:true,
    reviewed_parent_ancestor_required:false,
    saga_source_path:SAGA,
    saga_source_git_blob_sha1:SAGA_BLOB,saga_source_bytes:original.length,
    saga_source_sha256:sha256(original),
    dockerfile_git_blob_sha1:DOCKER_BLOB,
    ...census,
    source_module_import_time_policy_verified:true,
    packaged_file_identity_verified_by_this_proof:false,
    actual_saga_module_imported:false,
    saga_runtime_behaviour_reviewed:false,
    injected_adapters_or_wallet_signer_access_verified:false,
    executed_saga_loader_qualified:false,
    accepted_enforcement_generation:false,
    deployed_artifact_generation_verified:false,
    production_source_finality_authority_ready:false,
    presale_activation:false,
    funds_movement:false};
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test")syntheticNegatives();
else if(args.length===1&&args[0]==="--derive")
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
else throw Error("composed_saga_source_top_level_census_only_no_runtime_authority");
