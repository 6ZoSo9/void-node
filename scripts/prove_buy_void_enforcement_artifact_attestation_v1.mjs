import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_HEAD = '13bef3b85ad6cf4a1ea3d65425c92fec0f17fd9d';
export const ENTRY = 'dist/economic/buy_void_delivery_runtime_integration_v1.js';
export const PREFLIGHT = 'dist/economic/buy_void_source_finality_execution_preflight_v1.js';
export const MANIFEST = 'docs/architecture/buy-void-enforcement-artifact-attestation-v1.json';
const INPUTS = ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.build.json',
  'scripts/copy_void_runtime_js_v1.mjs', 'scripts/retire_saveblock_periodic_rewriters_v1.mjs',
  'Dockerfile'];
const EXTERNALS = new Set(['express', 'ethers', 'node:crypto', 'node:fs', 'node:path',
  'node:http', 'node:https', 'node:perf_hooks', 'node:url']);
export const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(k => [k, item[k]])) : item;
});
export const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function git(...args) { return execFileSync('git', args, {cwd: ROOT, maxBuffer: 32 * 1024 * 1024}); }
export function read(root, relative) {
  assert.match(relative, /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/);
  assert.ok(!relative.split('/').some(p => p === '..' || p === '.'));
  const resolvedRoot = path.resolve(root);
  assert.equal(fs.realpathSync(resolvedRoot), resolvedRoot, 'symlink root');
  let current = resolvedRoot;
  for (const component of relative.split('/')) {
    current = path.join(current, component);
    assert.ok(!fs.lstatSync(current).isSymbolicLink(), `symlink: ${relative}`);
  }
  const st = fs.statSync(current);
  assert.ok(st.isFile() && st.size > 0 && st.size <= 16 * 1024 * 1024, `file size/type: ${relative}`);
  const bytes = fs.readFileSync(current);
  assert.equal(bytes.length, st.size);
  return bytes;
}
function record(root, p) { const b = read(root, p); return {path:p, bytes:b.length, sha256:digest(b)}; }
export function imports(p, bytes) {
  const ast = ts.createSourceFile(p, bytes.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0, `invalid JS: ${p}`);
  const relative = new Set(), external = new Set();
  function add(node) {
    assert.ok(node && ts.isStringLiteral(node), `nonliteral import: ${p}`);
    const spec = node.text;
    if (spec.startsWith('.')) {
      assert.match(spec, /^\.\/[a-z0-9_]+\.js$/, `escaping/unknown import: ${p}:${spec}`);
      relative.add(path.posix.join(path.posix.dirname(p), spec));
    } else {
      assert.ok(EXTERNALS.has(spec), `unknown external: ${p}:${spec}`);
      external.add(spec);
    }
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) add(node.moduleSpecifier);
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        assert.equal(node.arguments.length, 1); add(node.arguments[0]);
      }
      // This reviewed ESM closure has no alternate loader or eval path.
      const expr = node.expression.getText(ast);
      assert.ok(!/\b(require|createRequire|eval|Function)\b/.test(expr), `unsupported loader/eval: ${p}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return {imports:[...relative].sort(), externals:[...external].sort()};
}
export function closure(root) {
  const pending = [ENTRY], seen = new Set(), records = [];
  while (pending.length) {
    const p = pending.pop();
    if (seen.has(p)) continue;
    assert.ok(seen.size < 128, 'closure too large');
    seen.add(p);
    const bytes = read(root, p), graph = imports(p, bytes);
    records.push({path:p, bytes:bytes.length, sha256:digest(bytes), ...graph});
    pending.push(...graph.imports);
  }
  assert.ok(seen.has(PREFLIGHT), 'omitted preflight');
  return records.sort((a,b) => a.path.localeCompare(b.path, 'en'));
}
export function derive(root = ROOT) {
  assert.ok([22,24,26].includes(Number(process.versions.node.split('.')[0])), 'unsupported Node');
  git('merge-base', '--is-ancestor', SOURCE_HEAD, 'HEAD');
  assert.equal(git('ls-tree', SOURCE_HEAD, '--', '.dockerignore').length, 0);
  assert.ok(!fs.existsSync(path.join(ROOT,'.dockerignore')), 'unreviewed dockerignore');
  const artifacts = closure(root);
  const sources = artifacts.map(a => a.path.replace(/^dist\//,'src/').replace(/\.js$/,'.ts'));
  // Bind the full tracked source tree, including ambient/compiler inputs. The
  // historical six-file manifest is separate and is never reinterpreted here.
  git('diff', '--exit-code', SOURCE_HEAD, 'HEAD', '--', 'src', ...INPUTS);
  const dirty = git('status','--porcelain=v1','--','src',...INPUTS).toString();
  assert.equal(dirty, '', 'dirty build inputs');
  const inputs = [...sources,...INPUTS].sort().map(p => {
    const b = read(ROOT,p), committed = git('show',`${SOURCE_HEAD}:${p}`);
    assert.deepEqual(b,committed,`source/input drift: ${p}`);
    return {...record(ROOT,p), git_blob_sha1:git('rev-parse',`${SOURCE_HEAD}:${p}`).toString().trim()};
  });
  const lock = JSON.parse(read(ROOT,'package-lock.json'));
  assert.equal(ts.version, lock.packages['node_modules/typescript'].version);
  const body = {
    schema:'void_buy_void_enforcement_artifact_attestation_v1', version:1,
    repository:'6ZoSo9/void-node', source_head:SOURCE_HEAD,
    source_tree:git('rev-parse',`${SOURCE_HEAD}:src`).toString().trim(),
    entry_artifact:ENTRY, artifacts, inputs,
    source_artifact_mapping:artifacts.map(a => ({source:a.path.replace(/^dist\//,'src/').replace(/\.js$/,'.ts'),artifact:a.path})),
    compiler:{version:ts.version, typescript_js:record(ROOT,'node_modules/typescript/lib/typescript.js'),
      tsc_js:record(ROOT,'node_modules/typescript/lib/_tsc.js')},
    absent_build_inputs:['.dockerignore'], build_command:'npm run build', derivation_node_majors:[22,24,26],
    external_dependency_boundary:'Node builtins and package-lock-bound express/ethers; external package code is not part of the relative ESM closure',
    production_source_finality_authority_ready:false, deployed_artifact_generation_verified:false,
  };
  return {...body, enforcement_artifact_set_sha256:digest(canonical(body))};
}
export function verify(root, expected) {
  assert.equal(canonical(derive(root)),canonical(expected),'enforcement manifest/closure mismatch');
}
async function proveCompiledGate(root) {
  const bytes = read(root, ENTRY).toString('utf8');
  const ast = ts.createSourceFile(ENTRY, bytes, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const functions = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'sourceFinalityGuardedDependencies');
  assert.equal(functions.length, 1, 'one compiled dependency gate');
  let preflights = 0, calls = 0;
  const context = vm.createContext({
    runBuyVoidSourceFinalityExecutionPreflightV1: async () => {preflights++; return {ok:false,reason:'synthetic_hold'};},
  });
  const create = vm.runInContext('(' + functions[0].getText(ast) + ')',context,{timeout:1000});
  const forbidden = async () => {calls++; throw new Error('underlying capability invoked');};
  const wrapped = create('/synthetic', '1'.repeat(64), {
    signer:{get_address:forbidden,sign_transaction:forbidden},
    broadcaster:{broadcast_signed_transaction:forbidden},
  });
  for(const invoke of [()=>wrapped.signer.get_address(),()=>wrapped.signer.sign_transaction({}),()=>wrapped.broadcaster.broadcast_signed_transaction('synthetic')]) {
    await assert.rejects(invoke,/buy_void_source_finality_preflight_held:synthetic_hold/);
  }
  assert.equal(preflights,1,'one lazy preflight per command');
  assert.equal(calls,0,'no capability after held preflight');
}

function falsifiers(expected) {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'void-enforcement-'));
  try {
    for(const a of expected.artifacts) {const dest=path.join(temp,a.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(ROOT,a.path),dest);}
    verify(temp,expected);
    const preflight=path.join(temp,PREFLIGHT), entry=path.join(temp,ENTRY);
    const originalPreflight=fs.readFileSync(preflight), originalEntry=fs.readFileSync(entry);
    const cases=[];
    function reject(name, mutate, restore) {try{mutate();assert.throws(()=>verify(temp,expected),undefined,name);cases.push(name);}finally{restore();}}
    reject('delete-preflight',()=>fs.unlinkSync(preflight),()=>fs.writeFileSync(preflight,originalPreflight));
    reject('substitute-preflight',()=>fs.writeFileSync(preflight,'export const held = false;\n'),()=>fs.writeFileSync(preflight,originalPreflight));
    const oldSource=git('show','67e85c3e2abe99753ec784f31e96f0448da12cc1:src/economic/buy_void_delivery_runtime_integration_v1.ts').toString();
    const oldJs=ts.transpileModule(oldSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
    reject('substitute-pr1476-runtime',()=>fs.writeFileSync(entry,oldJs),()=>fs.writeFileSync(entry,originalEntry));
    reject('import-redirection',()=>fs.writeFileSync(entry,originalEntry.toString().replace('./buy_void_source_finality_execution_preflight_v1.js','../outside.js')),()=>fs.writeFileSync(entry,originalEntry));
    const bypass=originalEntry.toString().replaceAll('await requirePreflight();','/* bypass */');
    assert.notEqual(bypass,originalEntry.toString());
    reject('wrapper-bypass',()=>fs.writeFileSync(entry,bypass),()=>fs.writeFileSync(entry,originalEntry));
    reject('dynamic-import',()=>fs.appendFileSync(entry,'\nimport(process.env.UNTRUSTED);\n'),()=>fs.writeFileSync(entry,originalEntry));
    reject('symlink-module',()=>{fs.unlinkSync(preflight);fs.symlinkSync(path.join(ROOT,PREFLIGHT),preflight);},()=>{fs.unlinkSync(preflight);fs.writeFileSync(preflight,originalPreflight);});
    for(const [name,mutate] of [
      ['wrong-generation',m=>{m.source_head='0'.repeat(40);} ],
      ['omitted-preflight-manifest',m=>{m.artifacts=m.artifacts.filter(a=>a.path!==PREFLIGHT);} ],
      ['extra-unreachable-manifest',m=>{m.artifacts.push({...m.artifacts[0],path:'dist/economic/unreachable.js'});} ],
    ]) {const m=structuredClone(expected);mutate(m);assert.throws(()=>verify(temp,m),undefined,name);cases.push(name);}
    console.log(`falsifiers=${JSON.stringify(cases)}`);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.length===1 && args[0]==='--derive') {
    process.stdout.write(JSON.stringify(derive(),null,2)+'\n');
  } else {
    assert.ok(args.length===0 || (args.length===2 && args[0]==='--packaged-root'),'invalid arguments');
    const expected=JSON.parse(read(ROOT,MANIFEST));
    verify(args.length ? path.resolve(args[1]) : ROOT,expected);
    await proveCompiledGate(args.length ? path.resolve(args[1]) : ROOT);
    falsifiers(expected);
    console.log('VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V1_GREEN');
    console.log(`enforcement_artifact_set_sha256=${expected.enforcement_artifact_set_sha256}`);
    console.log(`artifact_count=${expected.artifacts.length}`);
    console.log('production_source_finality_authority_ready=false;deployed_artifact_generation_verified=false');
  }
}
