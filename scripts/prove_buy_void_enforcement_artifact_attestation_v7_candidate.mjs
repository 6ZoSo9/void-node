#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  readDescriptorRelativeLinuxV1,
} from "./prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs";
import {
  runReviewedGitV1,
  proveReviewedGitV1Synthetic,
} from "./prove_buy_void_reviewed_git_invocation_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_HEAD = "51e8d399c985c96d5b07b52032661789ecb4a291";
const SOURCE_PREFLIGHT_GIT_BLOB = "dc6ad1fec00d4a57a8653104932bf136213fe293";
const SOURCE_V7_GIT_BLOB = "e5f7450a918934dd0b32e75280a6537776c31a78";
const SOURCE_V2_GIT_BLOB = "550ede02fc0b7d6874c324af58b5ef9c5591b311";
const OLD_ENFORCEMENT_V1_MANIFEST_BLOB = "b9d8a57f8a67f2e9180b15a608c178bc95bf84b5";
const OLD_ENFORCEMENT_V4_MANIFEST_BLOB = "d9e391bb058132b83a4eeaec00797e41dab9fa26";
const OLD_ENFORCEMENT_V4_SET_SHA = "854fa637d25f0931c37d5d35fda641adb38ad1f55ca23b2662fb97d42a262a7b";
const LOCKED_V5_MANIFEST_BLOB = "44dc5c187adeb35b6a41038a044165f1c6799c74";
const LOCKED_V5_GENERATION = "18758f6563f9a96aea0d55e293a4c10da8de349ba12ecc90fdebd82f486b944c";
const ACCEPTED_V6_MANIFEST =
  "docs/architecture/buy-void-enforcement-artifact-attestation-v6.json";
const ACCEPTED_V6_MANIFEST_BLOB = "f3ae81f3ccc1831f7811b61bbe7820e599c28dc8";
const ACCEPTED_V6_SET =
  "ea7abb9300215e4f76caea4706fa4c4c81465c32f30a3350fe4f01177f845cfb";
const EXPECTED_PACKAGE_LOCK_BLOB = "b2671f0149f522b2489247016df0a5ec4bb72b8b";
const ENTRY = "dist/economic/buy_void_delivery_runtime_integration_v1.js";
const PREFLIGHT = "dist/economic/buy_void_source_finality_execution_preflight_v1.js";
const V7 = "dist/economic/buy_void_source_finality_generation_provenance_v7.js";
const OLD_V4 = "dist/economic/buy_void_source_finality_generation_provenance_v4.js";
const OLD_V5 = "dist/economic/buy_void_source_finality_generation_provenance_v5.js";
const OLD_V6 = "dist/economic/buy_void_source_finality_generation_provenance_v6.js";
const INPUTS = Object.freeze([
  "package.json","package-lock.json","tsconfig.json","tsconfig.build.json",
  "scripts/copy_void_runtime_js_v1.mjs",
  "scripts/retire_saveblock_periodic_rewriters_v1.mjs","Dockerfile",
]);
const EXTERNALS = new Set([
  "express","ethers","node:crypto","node:fs","node:path","node:http",
  "node:https","node:perf_hooks","node:url","node:util",
]);
const MAX_BYTES = 16*1024*1024;
const REAL_SAGA_PROOF =
  "scripts/prove_buy_void_stopped_real_saga_loader_v1.mjs";
const REAL_SAGA_PROOF_BLOB = "f5fb5b731ca7ace13cf187ff33531da3dcd07693";
const SAGA_BEHAVIOR_PROOF =
  "scripts/prove_buy_void_crash_consistent_fulfillment_saga_v1.mjs";
const SAGA_BEHAVIOR_PROOF_BLOB = "d33206063799aaddf64ce178a618e174e0ddf628";
const SAGA_SOURCE =
  "tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const SAGA_SOURCE_BLOB = "d6a2d1cd82e5e255f435c1e21d1783774a44b2b1";
const PACKAGE_PROFILE =
  "ops/security/reviewed-node-package-runtime-enforcement-v1.json";
const PACKAGE_PROFILE_BLOB = "169216419f35c9213a96cde8d835c97ef4410710";
const PACKAGE_RUNTIME_TOOL =
  "tools/void-reviewed-node-package-runtime-v1.mjs";
const PACKAGE_RUNTIME_TOOL_BLOB = "6475c3f18ffe566cf5f448ca1de4795391a6efde";
const PACKAGE_RUNTIME_PROOF =
  "scripts/prove_void_reviewed_node_package_runtime_enforcement_v1.mjs";
const PACKAGE_RUNTIME_PROOF_BLOB = "841fedfe8d1a3ed2257d79104bc6086cafc290d6";
const EXPECTED_PROFILE_ID =
  "voidrnpr1_c15b7f3cb00d85f378a69cfc536c3845e29f9be7047e3af0f9fbd646eb2f5860";
const EXPECTED_PACKAGE_AGGREGATE =
  "5eb57ae9bfa6a0f195d5ccf40697985f0043456057525c3fdca7f4c894173561";
const QUALIFIED_DYNAMIC_IMPORTER =
  "dist/economic/buy_void_erc20_execution_composition_v1.js";
const QUALIFIED_DYNAMIC_SPECIFIER =
  "../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs";

function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function gitBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");
}
function canonical(value) {
  if(value === null) return "null";
  if(typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if(typeof value === "number") { assert.ok(Number.isSafeInteger(value),"unsafe number"); return String(value); }
  if(Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";
  assert.ok(value && typeof value === "object","noncanonical object");
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
}
function readPinned(root,relative,max=MAX_BYTES) {
  return readDescriptorRelativeLinuxV1(root,relative,max);
}
function record(rel) {
  const bytes=readPinned(ROOT,rel);
  return {path:rel,bytes:bytes.length,sha256:sha256(bytes),git_blob_sha1:gitBlob(bytes)};
}
// Inventory the statically reachable compiled closure. Code-generated imports
// are observed only as separate UNQUALIFIED candidate dependency boundaries:
// seeing a literal new Function importer is NOT proof of its executed target.
function scan(p,bytes) {
  const ast=ts.createSourceFile(p,bytes.toString("utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length,0,"invalid compiled JS: "+p);
  const relatives=new Set(), externals=new Set();
  const dynamicFactories=[],dynamicTargets=[];
  const forbiddenLoaderNames=new Set(["require","createRequire","eval","Function"]);
  const dynamicGlobalNames=new Set(["globalThis","global","window","self"]);
  function dynamicGlobal(node) {
    return ts.isIdentifier(node)&&dynamicGlobalNames.has(node.text);
  }
  function allowedRootGlobalReference(node) {
    if(p!==ENTRY||!ts.isIdentifier(node)||node.text!=="globalThis") return false;
    const parent=node.parent;
    if(ts.isElementAccessExpression(parent)&&parent.expression===node&&
       ts.isIdentifier(parent.argumentExpression)&&
       parent.argumentExpression.text==="GLOBAL_DEPENDENCIES") return true;
    if(ts.isVariableDeclaration(parent)&&parent.initializer===node&&
       ts.isIdentifier(parent.name)&&parent.name.text==="globalState") return true;
    return false;
  }
  function allowedRootGlobalStateReference(node) {
    if(p!==ENTRY||!ts.isIdentifier(node)||node.text!=="globalState") return false;
    const parent=node.parent;
    if(ts.isVariableDeclaration(parent)&&parent.name===node&&
       parent.initializer&&dynamicGlobal(parent.initializer)) return true;
    return ts.isPropertyAccessExpression(parent)&&parent.expression===node&&
      (parent.name.text==="__void_http_app"||parent.name.text==="app");
  }
  function forbiddenLoaderReference(node) {
    if(ts.isIdentifier(node)) return forbiddenLoaderNames.has(node.text);
    if(ts.isPropertyAccessExpression(node)) {
      if(dynamicGlobal(node.expression)) return true;
      if(ts.isIdentifier(node.expression)&&node.expression.text==="globalState"&&p===ENTRY) {
        return node.name.text!=="__void_http_app"&&node.name.text!=="app";
      }
    }
    if(ts.isElementAccessExpression(node)) {
      if(dynamicGlobal(node.expression)) {
        return !(p===ENTRY&&ts.isIdentifier(node.argumentExpression)&&
          node.argumentExpression.text==="GLOBAL_DEPENDENCIES");
      }
      if(ts.isIdentifier(node.expression)&&node.expression.text==="globalState"&&p===ENTRY) {
        return true;
      }
    }
    return false;
  }
  function add(value) {
    assert.ok(value&&ts.isStringLiteral(value),"nonliteral dynamic import:"+p);
    const spec=value.text;
    if(spec.startsWith(".")) {
      assert.match(spec,/^\.\/[a-z0-9_]+\.js$/u,"relative import escapes closure");
      relatives.add(path.posix.join(path.posix.dirname(p),spec));
    } else {
      assert.ok(EXTERNALS.has(spec),"unreviewed external module:"+p+":"+spec);
      externals.add(spec);
    }
  }
  function visit(node) {
    if(ts.isIdentifier(node)&&dynamicGlobal(node)) {
      assert.equal(allowedRootGlobalReference(node),true,
        "unreviewed dynamic global reference:"+p);
    }
    if(ts.isIdentifier(node)&&node.text==="globalState"&&p===ENTRY) {
      assert.equal(allowedRootGlobalStateReference(node),true,
        "unreviewed runtime globalState reference:"+p);
    }
    if(ts.isPropertyAccessExpression(node)||ts.isElementAccessExpression(node)) {
      assert.equal(forbiddenLoaderReference(node),false,
        "dynamic global loader access:"+p);
    }
    if(ts.isIdentifier(node)&&forbiddenLoaderNames.has(node.text)) {
      const canonicalFunctionConstructor=
        node.text==="Function"&&ts.isNewExpression(node.parent)&&
        node.parent.expression===node;
      assert.equal(canonicalFunctionConstructor,true,
        "dynamic loader identifier reference:"+p);
    }
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier) add(node.moduleSpecifier);
    if(ts.isVariableDeclaration(node)&&node.initializer&&
       forbiddenLoaderReference(node.initializer)) {
      assert.fail("aliased dynamic loader:"+p);
    }
    if(ts.isVariableDeclaration(node)&&node.initializer&&dynamicGlobal(node.initializer)) {
      const reviewedGlobalState =
        p===ENTRY&&ts.isIdentifier(node.name)&&node.name.text==="globalState";
      assert.equal(reviewedGlobalState,true,"unreviewed dynamic global alias:"+p);
    }
    if(ts.isVariableDeclaration(node)&&node.initializer&&
       dynamicGlobal(node.initializer)&&ts.isObjectBindingPattern(node.name)) {
      for(const element of node.name.elements) {
        const property=element.propertyName||element.name;
        assert.ok(!ts.isComputedPropertyName(property),
          "computed dynamic-global destructuring:"+p);
        const propertyText=ts.isIdentifier(property)||ts.isStringLiteral(property)
          ?property.text:"";
        assert.equal(forbiddenLoaderNames.has(propertyText),false,
          "destructured dynamic loader:"+p);
      }
    }
    if(ts.isBinaryExpression(node)&&
       node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&
       (forbiddenLoaderReference(node.right)||dynamicGlobal(node.right))) {
      assert.fail("assigned dynamic loader/global:"+p);
    }
    if(ts.isCallExpression(node)){
      if(node.expression.kind===ts.SyntaxKind.ImportKeyword) {
        assert.equal(node.arguments.length,1,"noncanonical import");
        add(node.arguments[0]);
      }
      const expression=node.expression.getText(ast);
      assert.equal(forbiddenLoaderReference(node.expression),false,
        "alternate dynamic loader reference:"+p);
      assert.doesNotMatch(expression,/\b(require|createRequire|eval|Function)\b/u,
        "alternate dynamic loader:"+p);
      if(ts.isIdentifier(node.expression)&&node.expression.text==="dynamicImport"){
        assert.equal(node.arguments.length,1,"unmodeled indirect importer cardinality:"+p);
        const specifier=node.arguments[0];
        assert.ok(ts.isStringLiteral(specifier),"unmodeled indirect import argument:"+p);
        assert.match(specifier.text,
          /^\.\.\/\.\.\/tools\/buy-void-[a-z0-9-]+-v[0-9]+\.mjs$/u,
          "unreviewed dynamically imported tool path:"+p);
        dynamicTargets.push(specifier.text);
      }
    }
    if(ts.isNewExpression(node)){
      const expression=node.expression.getText(ast);
      if(forbiddenLoaderReference(node.expression)&&expression!=="Function") {
        assert.fail("alternate dynamic constructor:"+p);
      }
      if(/\bFunction\b/u.test(expression)){
        assert.equal(expression,"Function","unreviewed Function constructor expression:"+p);
        const args=node.arguments||[];
        assert.ok(args.length===2&&args.every(a=>ts.isStringLiteral(a)),
          "unreviewed Function constructor arguments:"+p);
        assert.equal(args[0].text,"specifier","unreviewed Function constructor parameter:"+p);
        assert.equal(args[1].text,"return import(specifier)",
          "unreviewed Function constructor code:"+p);
        dynamicFactories.push("new Function(specifier, return import(specifier))");
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);
  // Census shape is strict, but the executable target/dependency closure is
  // NOT authenticated. Never promote this census to production authority.
  assert.equal(dynamicFactories.length,dynamicTargets.length,
    "unpaired code-generated dynamic import:"+p);
  assert.ok(dynamicFactories.length<=1,"multiple code-generated importers:"+p);
  return {
    imports:[...relatives].sort(),
    externals:[...externals].sort(),
    dynamic_tool_import_specifiers:[...new Set(dynamicTargets)].sort(),
    dynamic_function_importer_present:dynamicFactories.length!==0
  };
}
function closedArtifacts() {
  const pending=[ENTRY],found=new Map();
  while(pending.length) {
    const p=pending.pop();
    if(found.has(p)) continue;
    assert.ok(found.size<128,"enforcement closure exceeds bound");
    assert.match(p,/^dist\/economic\/[a-z0-9_]+\.js$/u,"unexpected closure path");
    const bytes=readPinned(ROOT,p),graph=scan(p,bytes);
    found.set(p,{path:p,bytes:bytes.length,sha256:sha256(bytes),...graph});
    pending.push(...graph.imports);
  }
  assert.ok(found.has(PREFLIGHT),"preflight not in enforcement closure");
  assert.ok(found.has(V7),"V7 not present in enforcement closure");
  assert.ok(!found.has(OLD_V4)&&!found.has(OLD_V5),
    "historical V4/V5 finality still reachable");
  assert.ok(!found.has(OLD_V6),"historical V6 finality still reachable after V7 integration");
  assert.ok(found.has("dist/economic/buy_void_verified_payment_v2.js"),
    "canonical V2 verifier missing");
  return [...found.values()].sort((a,b)=>a.path.localeCompare(b.path,"en"));
}
function runSelfTest() {
  const valid=scan(ENTRY,Buffer.from('import "./buy_void_source_finality_execution_preflight_v1.js";\n'));
  assert.ok(valid.imports.includes(PREFLIGHT));
  // Current reviewed V2 verifier imports built-in util.types.isProxy to
  // reject adversarial Proxy inputs BEFORE policy semantic evaluation.
  // This is a precise builtin addition, not an allowance for arbitrary
  // third-party modules, eval or dynamic loader imports.
  const verifiedPaymentBuiltin=scan(
    "dist/economic/buy_void_verified_payment_v2.js",
    Buffer.from('import { types as utilTypes } from "node:util";\n'),
  );
  assert.deepEqual(verifiedPaymentBuiltin.externals, ["node:util"]);
  assert.throws(() => scan(
    "dist/economic/buy_void_verified_payment_v2.js",
    Buffer.from('import { execSync } from "node:child_process";\n'),
  ), undefined, "unreviewed runtime builtin must still HOLD");
  const reviewedGlobals=scan(ENTRY,Buffer.from(
    'const GLOBAL_DEPENDENCIES="__void_buy_void_delivery_runtime_dependencies_v1";\n'+
    'const value=globalThis[GLOBAL_DEPENDENCIES];\n'+
    'const globalState=globalThis;\n'+
    'const app=globalState.__void_http_app||globalState.app;\n'
  ));
  assert.deepEqual(reviewedGlobals.imports,[]);
  for(const bad of [
    'const g=globalThis; const runner=g.eval; runner("2+2");',
    'const globalState=globalThis; const runner=globalState.eval; runner("2+2");',
    'const globalState=globalThis; const runner=globalState["eval"]; runner("2+2");',
    'let g; g=globalThis;'
  ]) assert.throws(()=>scan(ENTRY,Buffer.from(bad)),undefined,bad);
  for(const bad of [
    'await import(process.env.UNKNOWN);',
    'import("../outside.js");',
    'import("node:child_process");',
    'require("./other.js");',
    'eval("2+2");',
    'const runner=eval; runner("2+2");',
    'const runner=globalThis["ev"+"al"]; runner("2+2");',
    'const runner=globalThis.eval.bind(globalThis); runner("2+2");',
    'const {eval:runner}=globalThis; runner("2+2");',
    'const {["ev"+"al"]:runner}=globalThis; runner("2+2");',
    'const F=Function; new F("return 3");',
    'const F=globalThis["Fun"+"ction"]; F("return 2")();',
    'new Function("return 3");',
  ]) assert.throws(()=>scan(ENTRY,Buffer.from(bad)),undefined,bad);
  // The observed constructor shape may be CENSUSED, never authorized as a
  // closed runtime dependency. A different constructor/target still HOLDs.
  const observedDynamic=scan(ENTRY,Buffer.from(
    'const dynamicImport = new Function("specifier","return import(specifier)");\n' +
    'dynamicImport("../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs");\n'
  ));
  assert.equal(observedDynamic.dynamic_function_importer_present,true);
  assert.deepEqual(observedDynamic.dynamic_tool_import_specifiers,
    ["../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs"]);
  for(const bad of [
    'const dynamicImport = new Function("specifier","return import(specifier)"); dynamicImport(process.env.UNTRUSTED);',
    'const dynamicImport = new Function("specifier","return import(specifier)"); dynamicImport("../../outside.mjs");',
    'const dynamicImport = new Function("specifier","return eval(specifier)"); dynamicImport("../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs");',
    'const dynamicImport = new Function("specifier","return import(specifier)");',
    'dynamicImport("../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs");',
  ])assert.throws(()=>scan(ENTRY,Buffer.from(bad)),undefined,bad);
  proveReviewedGitV1Synthetic();
  console.log("descriptor_relative_linux_reader_integrated=true");
  console.log("reviewed_absolute_git_invocation_integrated=true");
  console.log("VOID_BUY_VOID_ENFORCEMENT_V7_CANDIDATE_SELF_TEST_GREEN");
  console.log("nonliteral_and_external_imports_rejected=true");
  console.log("reviewed_node_util_builtin_only=true");
  console.log("unreviewed_node_child_process_builtin_rejected=true");
  console.log("recognized_dynamic_constructor_census_only=true");
  console.log("unrecognized_dynamic_loaders_rejected=true");
  console.log("computed_global_dynamic_loader_aliases_rejected=true");
  console.log("assigned_dynamic_loader_aliases_rejected=true");
  console.log("dynamic_tool_execution_identity_verified=false");
  console.log("same_size_source_inode_substitution_rejected=true");
  console.log("growth_buffer_bounded_to_pinned_size_plus_one=true");
  console.log("source_runtime_unchanged=true");
  console.log("candidate_acceptance=false");
}
function evidenceText(relative, pattern, label) {
  assert.match(relative, pattern, label + "_path_invalid");
  const absolute = path.join(ROOT, relative);
  const stat = fs.lstatSync(absolute);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 &&
    stat.size > 0 && stat.size <= 2 * 1024 * 1024,
    label + "_file_invalid");
  return fs.readFileSync(absolute, "utf8");
}
function qualifySuccessorEvidence(input) {
  for (const [file, expected] of [
    [REAL_SAGA_PROOF, REAL_SAGA_PROOF_BLOB],
    [SAGA_BEHAVIOR_PROOF, SAGA_BEHAVIOR_PROOF_BLOB],
    [SAGA_SOURCE, SAGA_SOURCE_BLOB],
    [PACKAGE_PROFILE, PACKAGE_PROFILE_BLOB],
    [PACKAGE_RUNTIME_TOOL, PACKAGE_RUNTIME_TOOL_BLOB],
    [PACKAGE_RUNTIME_PROOF, PACKAGE_RUNTIME_PROOF_BLOB],
  ]) {
    assert.equal(gitBlob(readPinned(ROOT, file)), expected,
      "successor_evidence_blob_drift:" + file);
  }

  const realSaga = JSON.parse(evidenceText(
    input.realSagaEvidencePath,
    /^enforcement-v7-real-saga-(22|24|26)[.]json$/u,
    "real_saga_evidence",
  ));
  assert.equal(realSaga.schema, "void_buy_void_stopped_real_saga_loader_v1");
  assert.equal(realSaga.marker, "VOID_BUY_VOID_STOPPED_REAL_SAGA_LOADER_V1");
  assert.equal(realSaga.compiled_importer_path, QUALIFIED_DYNAMIC_IMPORTER);
  assert.equal(realSaga.saga_source_path, SAGA_SOURCE);
  assert.equal(realSaga.saga_source_git_blob_sha1, SAGA_SOURCE_BLOB);
  assert.equal(realSaga.real_saga_module_imported, true);
  assert.equal(realSaga.real_saga_module_initialized, true);
  assert.equal(realSaga.real_saga_exports_invoked, false);
  assert.equal(realSaga.executed_saga_loader_qualified, true);
  assert.equal(realSaga.dynamic_tool_transitive_closure_verified_for_saga_edge, true);
  assert.equal(realSaga.production_source_finality_authority_ready, false);
  assert.equal(realSaga.funds_movement, false);

  const behavior = evidenceText(
    input.sagaBehaviorLogPath,
    /^enforcement-v7-saga-behavior-(22|24|26)[.]log$/u,
    "saga_behavior_evidence",
  );
  for (const needle of [
    '"network_request_performed": false',
    '"credential_access_performed": false',
    '"wallet_access_performed": false',
    '"signing_performed": false',
    '"transaction_broadcast_performed": false',
    '"money_movement": false',
    "VOID_BUY_VOID_CRASH_CONSISTENT_FULFILLMENT_SAGA_V1_PROOF_GREEN",
  ]) assert.ok(behavior.includes(needle), "saga_behavior_evidence_missing:" + needle);

  const packageLog = evidenceText(
    input.packageRuntimeLogPath,
    /^enforcement-v7-package-runtime-(22|24|26)[.]log$/u,
    "package_runtime_evidence",
  );
  for (const needle of [
    "VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_V1_LOCK_GREEN",
    "root_packages=ethers,express",
    "packages_aggregate_sha256=" + EXPECTED_PACKAGE_AGGREGATE,
    "profile_id=" + EXPECTED_PROFILE_ID,
    "private_express_and_ethers_import_green=true",
    "profile_identity_accepted=true",
    "funds_movement=false",
  ]) assert.ok(packageLog.includes(needle), "package_runtime_evidence_missing:" + needle);

  const profile = JSON.parse(readPinned(ROOT, PACKAGE_PROFILE).toString("utf8"));
  assert.equal(profile.marker,"VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_V1");
  assert.equal(profile.status,"REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_IDENTITY");
  assert.deepEqual(profile.root_packages,["ethers","express"]);
  assert.equal(profile.profile_id,EXPECTED_PROFILE_ID);
  assert.equal(profile.packages_aggregate_sha256,EXPECTED_PACKAGE_AGGREGATE);
  assert.equal(profile.profile_identity_accepted,true);
  assert.equal(profile.package_json_git_blob_sha1,
    "f28c3e9446c7623ef203da36a9642d046e5f34ee");
  assert.equal(profile.package_lock_git_blob_sha1,EXPECTED_PACKAGE_LOCK_BLOB);

  return Object.freeze({
    real_saga_loader_evidence_schema: realSaga.schema,
    real_saga_loader_evidence_compiled_importer_sha256:
      realSaga.compiled_importer_sha256,
    real_saga_loader_evidence_saga_sha256: realSaga.saga_source_sha256,
    real_saga_loader_qualified: true,
    real_saga_exports_invoked: false,
    real_saga_behavior_proof_git_blob_sha1: SAGA_BEHAVIOR_PROOF_BLOB,
    real_saga_behavior_inert_adapters_green: true,
    package_runtime_profile_git_blob_sha1: PACKAGE_PROFILE_BLOB,
    package_runtime_profile_id: EXPECTED_PROFILE_ID,
    package_runtime_aggregate_sha256: EXPECTED_PACKAGE_AGGREGATE,
    package_runtime_root_packages: ["ethers","express"],
    ethers_package_runtime_verified: true,
    express_package_runtime_verified: true,
    third_party_package_runtime_closure_verified: true,
  });
}

export function deriveBuyVoidEnforcementArtifactAttestationV7Candidate(input) {
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])),
    "node major not reviewed");
  assert.ok(!fs.existsSync(path.join(ROOT,".dockerignore")),"unreviewed build ignore");
  assert.equal(ts.version,"5.9.3");
  assert.equal(gitBlob(readPinned(ROOT,"package-lock.json")),EXPECTED_PACKAGE_LOCK_BLOB);

  for(const [file,blob] of [
    ["src/economic/buy_void_source_finality_execution_preflight_v1.ts",
      SOURCE_PREFLIGHT_GIT_BLOB],
    ["src/economic/buy_void_source_finality_generation_provenance_v7.ts",
      SOURCE_V7_GIT_BLOB],
    ["src/economic/buy_void_verified_payment_v2.ts",SOURCE_V2_GIT_BLOB],
    ["docs/architecture/buy-void-enforcement-artifact-attestation-v1.json",
      OLD_ENFORCEMENT_V1_MANIFEST_BLOB],
    ["docs/architecture/buy-void-enforcement-artifact-attestation-v4.json",
      OLD_ENFORCEMENT_V4_MANIFEST_BLOB],
    ["docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v5.json",
      LOCKED_V5_MANIFEST_BLOB],
    [ACCEPTED_V6_MANIFEST,ACCEPTED_V6_MANIFEST_BLOB],
  ]) assert.equal(gitBlob(readPinned(ROOT,file)),blob,
    "bound source/ancestor blob drift:"+file);

  const previousV1=JSON.parse(readPinned(ROOT,
    "docs/architecture/buy-void-enforcement-artifact-attestation-v1.json"));
  const previousV4=JSON.parse(readPinned(ROOT,
    "docs/architecture/buy-void-enforcement-artifact-attestation-v4.json"));
  const compiledV5=JSON.parse(readPinned(ROOT,
    "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v5.json"));
  const acceptedV6=JSON.parse(readPinned(ROOT,ACCEPTED_V6_MANIFEST));

  assert.equal(previousV1.artifacts.length,23,"unexpected historical closure cardinality");
  assert.equal(previousV4.current_enforcement.enforcement_artifact_set_sha256,
    OLD_ENFORCEMENT_V4_SET_SHA);
  assert.equal(compiledV5.compiled_artifact_generation_sha256,LOCKED_V5_GENERATION);
  assert.equal(compiledV5.compiled_artifact_generation_verified,true);
  assert.equal(acceptedV6.accepted_enforcement_set_sha256,ACCEPTED_V6_SET);
  assert.equal(acceptedV6.complete_executable_closure_verified,true);
  assert.equal(acceptedV6.candidate_identity_accepted,true);
  assert.equal(acceptedV6.production_source_finality_authority_ready,false);

  runReviewedGitV1(["merge-base","--is-ancestor",SOURCE_HEAD,"HEAD"],ROOT);
  const artifacts=closedArtifacts();
  const sourceRuntimeInputs=[
    ...new Set([
      ...artifacts.map(a=>
        a.path.replace(/^dist\//u,"src/").replace(/\.js$/u,".ts")),
      ...INPUTS,
    ]),
  ].sort();
  runReviewedGitV1([
    "diff","--quiet","--no-ext-diff","--no-textconv",
    SOURCE_HEAD,"HEAD","--",...sourceRuntimeInputs,
  ],ROOT);

  const dynamicToolsRaw=artifacts.flatMap(module=>
    module.dynamic_tool_import_specifiers.map(specifier=>({
      importer_artifact:module.path,
      tool_specifier:specifier,
      code_generation_form:"new Function(specifier, return import(specifier))",
    }))
  ).sort((a,b)=>
    (a.importer_artifact+"|"+a.tool_specifier).localeCompare(
      b.importer_artifact+"|"+b.tool_specifier,"en")
  );
  assert.deepEqual(
    dynamicToolsRaw.map(edge=>({
      importer_artifact:edge.importer_artifact,
      tool_specifier:edge.tool_specifier,
    })),
    [{
      importer_artifact:QUALIFIED_DYNAMIC_IMPORTER,
      tool_specifier:QUALIFIED_DYNAMIC_SPECIFIER,
    }],
    "current enforcement dynamic edge set changed",
  );

  const evidence=qualifySuccessorEvidence(input);
  const dynamicTools=dynamicToolsRaw.map(edge=>Object.freeze({
    ...edge,
    executed_target_verified:true,
    dynamic_tool_transitive_closure_verified:true,
    evidence_contract:"VOID_BUY_VOID_STOPPED_REAL_SAGA_LOADER_V1",
    target_git_blob_sha1:SAGA_SOURCE_BLOB,
  }));

  const thirdPartyPackages=[...new Set(
    artifacts.flatMap(row=>row.externals)
      .filter(specifier=>!specifier.startsWith("node:"))
  )].sort();
  assert.deepEqual(thirdPartyPackages,["ethers","express"],
    "current third-party package boundary changed");
  assert.equal(evidence.ethers_package_runtime_verified,true);
  assert.equal(evidence.express_package_runtime_verified,true);
  assert.equal(evidence.third_party_package_runtime_closure_verified,true);

  const inputs=sourceRuntimeInputs.map(record);
  const old=new Map(previousV1.artifacts.map(a=>[a.path,a]));
  const now=new Map(artifacts.map(a=>[a.path,a]));
  const removed=[...old.keys()].filter(k=>!now.has(k)).sort();
  const added=[...now.keys()].filter(k=>!old.has(k)).sort();
  const changed=[...now.keys()].filter(k=>old.has(k) &&
    (now.get(k).sha256!==old.get(k).sha256 ||
      now.get(k).bytes!==old.get(k).bytes)).sort();
  const unchanged=[...now.keys()].filter(k=>old.has(k) &&
    now.get(k).sha256===old.get(k).sha256 &&
    now.get(k).bytes===old.get(k).bytes).sort();

  assert.ok(removed.includes(OLD_V4),
    "historical V4 runtime finality should leave active closure");
  assert.ok(added.includes(V7),"V7 runtime must enter closure");
  assert.ok(changed.includes(PREFLIGHT),
    "execution preflight should be a changed compiled module");

  const closedBody={
    schema:"void_buy_void_enforcement_artifact_v7_candidate",
    version:7,
    repository:"6ZoSo9/void-node",
    source_runtime_parent:SOURCE_HEAD,
    predecessor:{
      accepted_enforcement_v6_manifest_git_blob_sha1:ACCEPTED_V6_MANIFEST_BLOB,
      accepted_enforcement_v6_set_sha256:ACCEPTED_V6_SET,
      locked_source_finality_compiled_v5_manifest_blob:LOCKED_V5_MANIFEST_BLOB,
      locked_source_finality_compiled_v5_generation:LOCKED_V5_GENERATION,
    },
    source_fingerprints:{
      execution_preflight_git_blob_sha1:SOURCE_PREFLIGHT_GIT_BLOB,
      v7_finality_git_blob_sha1:SOURCE_V7_GIT_BLOB,
      verified_payment_v2_git_blob_sha1:SOURCE_V2_GIT_BLOB,
    },
    compiler:{
      typescript_version:ts.version,
      typescript_js:record("node_modules/typescript/lib/typescript.js"),
      tsc_js:record("node_modules/typescript/lib/_tsc.js"),
    },
    closed_entry_artifact:ENTRY,
    closed_runtime_artifacts:artifacts,
    static_relative_import_graph_bound:true,
    dynamic_tool_import_candidates:dynamicTools,
    dynamic_tool_candidate_count:dynamicTools.length,
    dynamic_tool_execution_identity_verified:true,
    dynamic_tool_transitive_closure_verified:true,
    no_dynamic_unknown_imports:true,
    third_party_package_imports:thirdPartyPackages,
    package_runtime_evidence:evidence,
    complete_executable_closure_verified:true,
    source_and_build_inputs:inputs,
    delta_from_historical_v1:{
      removed_paths:removed,added_paths:added,changed_paths:changed,
      unchanged_path_count:unchanged.length,
    },
    reviewed_node_majors:[22,24,26],
    no_unbounded_reader:true,
    candidate_identity_accepted:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    presale_activation:false,
    funds_movement:false,
  };
  return {
    ...closedBody,
    candidate_enforcement_set_sha256:
      sha256(Buffer.from(canonical(closedBody))),
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==="--self-test"){
    runSelfTest();
  } else if(args.length===4&&args[0]==="--derive") {
    const values=Object.fromEntries(args.slice(1).map(arg=>{
      const pos=arg.indexOf("=");
      assert.ok(pos>2,"evidence argument requires name=value");
      return [arg.slice(0,pos),arg.slice(pos+1)];
    }));
    process.stdout.write(JSON.stringify(
      deriveBuyVoidEnforcementArtifactAttestationV7Candidate({
        realSagaEvidencePath:values["--real-saga-evidence"],
        sagaBehaviorLogPath:values["--saga-behavior-log"],
        packageRuntimeLogPath:values["--package-runtime-log"],
      }),
      null,
      2,
    )+"\n");
  } else {
    throw Error("v7_candidate_derivation_only_no_locked_authority");
  }
}
