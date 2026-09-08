import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, MANIFEST, canonical, git, snapshot, derive, verify} from './prove_buy_void_enforcement_build_generation_v2.mjs';

// Isolated source/build fixtures only. No network, runtime, signer or image starts.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'void-enforcement-generation-'));
const fixture = path.join(temp, 'repo');
const cases = [];
const relative = 'src/ui/void_app_wave2_home_source_fetch_v1.ts';
function commit(message) {
  git(fixture, '-c', 'user.name=VOID source proof', '-c', 'user.email=source-proof@example.invalid',
    '-c', 'commit.gpgsign=false', 'commit', '-m', message);
  return git(fixture, 'rev-parse', 'HEAD').toString().trim();
}
async function rejects(name, run) {
  await assert.rejects(async () => run(), undefined, name);
  cases.push(name);
}
async function mutateFile(name, file, mutate, check) {
  const original = fs.readFileSync(file);
  const mode = fs.statSync(file).mode & 0o777;
  try { mutate(original); await rejects(name, check); }
  finally {
    if (fs.existsSync(file) || fs.lstatSync(path.dirname(file)).isDirectory()) {
      try { fs.unlinkSync(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    fs.writeFileSync(file, original, {mode});
  }
}

try {
  const head = git(ROOT, 'rev-parse', 'HEAD').toString().trim();
  git(ROOT, 'clone', '--shared', '--no-checkout', ROOT, fixture);
  git(fixture, 'checkout', '--detach', head);
  fs.cpSync(path.join(ROOT, 'node_modules'), path.join(fixture, 'node_modules'), {recursive:true});
  fs.cpSync(path.join(ROOT, 'dist'), path.join(fixture, 'dist'), {recursive:true});
  const original = snapshot(fixture, head);
  const first = await derive(fixture, head, original);
  await verify(fixture, head, original, first);

  // A new unrelated source generation is explicit, never relabeled as V1.
  fs.appendFileSync(path.join(fixture, relative), '\n// Isolated unrelated-source generation fixture.\n');
  git(fixture, 'add', '--', relative);
  const current = commit('test fixture: unrelated source generation');
  const before = snapshot(fixture, current);
  const record = await derive(fixture, current, before);
  assert.notEqual(before.source_tree, original.source_tree);
  assert.notEqual(record.build_generation_sha256, first.build_generation_sha256);
  assert.equal(record.historical_full_source_generation_preserved, false);
  assert.equal(record.historical_enforcement_artifact_bytes_preserved, true);
  assert.equal(record.independently_accepted, false);
  assert.equal(canonical(record.artifacts), canonical(first.artifacts));
  const legacy = await import(pathToFileURL(path.join(fixture, 'scripts/prove_buy_void_enforcement_artifact_attestation_v1.mjs')).href);
  await rejects('v1-still-rejects-new-full-source-generation', () => legacy.derive());
  await verify(fixture, current, before, record);
  await rejects('wrong-expected-checkout', () => snapshot(fixture, head));
  await rejects('nonexact-head-alias', () => snapshot(fixture, 'HEAD'));
  await rejects('stale-before-build-snapshot', () => derive(fixture, current, original));
  await rejects('stale-generation-record', () => verify(fixture, current, before, first));

  for (const [name, alter] of [
    ['forged-source-tree', value => { value.source_snapshot.source_tree = '0'.repeat(40); }],
    ['false-historical-preservation-promotion', value => { value.historical_full_source_generation_preserved = true; }],
    ['production-authority-promotion', value => { value.production_source_finality_authority_ready = true; }],
    ['independent-acceptance-promotion', value => { value.independently_accepted = true; }],
    ['omitted-artifact-record', value => { value.artifacts.pop(); }],
    ['extra-unreachable-artifact-record', value => { value.artifacts.push({...value.artifacts[0], path:'dist/economic/unreachable.js'}); }],
    ['extra-generation-field', value => { value.accepted = true; }],
  ]) {
    const changed = structuredClone(record); alter(changed);
    await rejects(name, () => verify(fixture, current, before, changed));
  }

  const source = path.join(fixture, relative);
  await mutateFile('dirty-source', source, b => fs.writeFileSync(source, Buffer.concat([b, Buffer.from('\n// dirty\n')])),
    () => snapshot(fixture, current));
  git(fixture, 'update-index', '--assume-unchanged', '--', relative);
  try {
    await mutateFile('assume-unchanged-source-rewrite', source, b => fs.writeFileSync(source, Buffer.concat([b, Buffer.from('\n// hidden\n')])),
      () => snapshot(fixture, current));
    await mutateFile('symlink-source', source, () => { fs.unlinkSync(source); fs.symlinkSync(path.join(ROOT, relative), source); },
      () => snapshot(fixture, current));
    await mutateFile('source-mode-drift', source, () => fs.chmodSync(source, 0o755),
      () => snapshot(fixture, current));
  } finally { git(fixture, 'update-index', '--no-assume-unchanged', '--', relative); }

  const ignored = 'src/ui/ignored_generation_input.ts';
  fs.appendFileSync(path.join(fixture, '.git/info/exclude'), '\n/' + ignored + '\n');
  fs.writeFileSync(path.join(fixture, ignored), 'export const hidden = true;\n');
  try {
    assert.equal(git(fixture, 'status', '--porcelain=v1').length, 0);
    await rejects('ignored-compiler-input', () => snapshot(fixture, current));
  } finally { fs.unlinkSync(path.join(fixture, ignored)); }
  fs.symlinkSync(path.join(temp, 'missing'), path.join(fixture, '.dockerignore'));
  try { await rejects('dangling-dockerignore', () => snapshot(fixture, current)); }
  finally { fs.unlinkSync(path.join(fixture, '.dockerignore')); }

  for (const file of ['tsconfig.build.json', MANIFEST, 'scripts/prove_buy_void_enforcement_artifact_attestation_v1.mjs',
    'src/economic/buy_void_source_finality_execution_preflight_v1.ts']) {
    fs.appendFileSync(path.join(fixture, file), file.endsWith('.json') ? ' ' : '\n// changed locked input\n');
    git(fixture, 'add', '--', file);
    const changed = commit('test fixture: changed locked input');
    try { await rejects('committed-locked-input:' + file, () => snapshot(fixture, changed)); }
    finally { git(fixture, 'checkout', '--detach', current); }
  }

  const preflight = path.join(fixture, legacy.PREFLIGHT);
  const entry = path.join(fixture, legacy.ENTRY);
  for (const [name, file, mutate] of [
    ['deleted-preflight', preflight, () => fs.unlinkSync(preflight)],
    ['substituted-preflight', preflight, () => fs.writeFileSync(preflight, 'export const held = false;\n')],
    ['wrapper-bypass', entry, b => fs.writeFileSync(entry, b.toString().replaceAll('await requirePreflight();', '/* bypass */'))],
    ['escaping-import', entry, b => fs.writeFileSync(entry, b.toString().replace('./buy_void_source_finality_execution_preflight_v1.js', '../outside.js'))],
    ['dynamic-import', entry, b => fs.writeFileSync(entry, Buffer.concat([b, Buffer.from('\nimport(process.env.UNTRUSTED);\n')]))],
    ['symlink-artifact', preflight, () => { fs.unlinkSync(preflight); fs.symlinkSync(path.join(ROOT, legacy.PREFLIGHT), preflight); }],
  ]) await mutateFile(name, file, mutate, () => derive(fixture, current, before));

  const compiler = path.join(fixture, 'node_modules/typescript/lib/typescript.js');
  await mutateFile('compiler-byte-drift', compiler, b => fs.writeFileSync(compiler, Buffer.concat([b, Buffer.from('\n// changed\n')])),
    () => derive(fixture, current, before));

  const packaged = path.join(temp, 'packaged');
  for (const item of record.artifacts) {
    fs.mkdirSync(path.dirname(path.join(packaged, item.path)), {recursive:true});
    fs.copyFileSync(path.join(fixture, item.path), path.join(packaged, item.path));
  }
  assert.equal(canonical(await derive(fixture, current, before, packaged)), canonical(record));
  const packagedPreflight = path.join(packaged, legacy.PREFLIGHT);
  await mutateFile('packaged-preflight-substitution', packagedPreflight, () => fs.writeFileSync(packagedPreflight, 'export const bypass = true;\n'),
    () => derive(fixture, current, before, packaged));

  const oldGitDir = process.env.GIT_DIR, oldWorkTree = process.env.GIT_WORK_TREE, oldPath = process.env.PATH;
  try {
    process.env.GIT_DIR = path.join(ROOT, '.git');
    process.env.GIT_WORK_TREE = ROOT;
    process.env.PATH = '/nonexistent';
    assert.equal(canonical(snapshot(fixture, current)), canonical(before), 'ambient Git redirected repository identity');
  } finally {
    for (const [key, value] of [['GIT_DIR', oldGitDir], ['GIT_WORK_TREE', oldWorkTree], ['PATH', oldPath]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
  await verify(fixture, current, before, record);
  console.log('VOID_BUY_VOID_ENFORCEMENT_BUILD_GENERATION_ADVERSARIES_V2_GREEN');
  console.log('rejection_cases=' + cases.length);
  console.log('cases=' + JSON.stringify(cases));
  console.log('new_source_generation_distinct=true;v1_historical_guard_preserved=true;packaged_generation_equal=true');
  console.log('ambient_git_cannot_redirect=true;production_source_finality_authority_ready=false');
} finally { fs.rmSync(temp, {recursive:true, force:true}); }
