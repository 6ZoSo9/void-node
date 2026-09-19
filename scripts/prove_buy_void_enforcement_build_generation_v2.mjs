// Current build identity plus preservation of the separately reviewed V1 lock.
// This module never executes an economic runtime, image or external capability.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HISTORICAL_HEAD = '029af8d02d0d3ff1f9481830c06aa340e9f67be0';
export const HISTORICAL_SOURCE = '13bef3b85ad6cf4a1ea3d65425c92fec0f17fd9d';
export const MANIFEST = 'docs/architecture/buy-void-enforcement-artifact-attestation-v1.json';
const LEGACY_TOOLS = [MANIFEST, 'scripts/prove_buy_void_enforcement_artifact_attestation_v1.mjs',
  'scripts/prove_buy_void_enforcement_image_identity_v1.py'];
const BUILD_INPUTS = ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.build.json',
  'scripts/copy_void_runtime_js_v1.mjs', 'scripts/retire_saveblock_periodic_rewriters_v1.mjs', 'Dockerfile'];
const VERIFIER_INPUTS = [...LEGACY_TOOLS,
  'scripts/prove_buy_void_enforcement_build_generation_v2.mjs',
  'scripts/prove_buy_void_enforcement_build_generation_adversaries_v2.mjs',
  '.github/workflows/buy-void-enforcement-artifact-attestation-v1.yml'];
const MAX_FILE = 16 * 1024 * 1024;
const MAX_FILES = 10000;
const MAX_TOTAL = 256 * 1024 * 1024;
export const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(k => [k, item[k]])) : item;
});
export const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

export function git(root, ...args) {
  const executable = fs.lstatSync('/usr/bin/git');
  assert.ok(executable.isFile() && executable.uid === 0 && (executable.mode & 0o022) === 0,
    'trusted native Git required');
  return execFileSync('/usr/bin/git', ['--no-replace-objects', '-c', 'core.fsmonitor=false',
    '-c', 'core.hooksPath=/dev/null', '-c', 'core.untrackedCache=false', '-C', root, ...args], {
    timeout: 30000, maxBuffer: 32 * 1024 * 1024,
    env: {PATH:'/usr/bin:/bin', LANG:'C', LC_ALL:'C', GIT_CONFIG_NOSYSTEM:'1',
      GIT_CONFIG_SYSTEM:'/dev/null', GIT_CONFIG_GLOBAL:'/dev/null', GIT_NO_REPLACE_OBJECTS:'1',
      GIT_NO_LAZY_FETCH:'1', GIT_ALLOW_PROTOCOL:'file', GIT_OPTIONAL_LOCKS:'0', GIT_TERMINAL_PROMPT:'0'},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function regularPath(root, relative) {
  assert.match(relative, /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/);
  assert.ok(relative.split('/').every(p => p !== '.' && p !== '..'), 'path components');
  let current = root;
  for (const component of relative.split('/')) {
    current = path.join(current, component);
    assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'symlink input');
  }
  return current;
}

// Read once under a byte/work ceiling and reject observable inode/size drift.
// The CI host/OS remain trusted; this is not isolation from a concurrent same-UID writer.
export function readRegular(root, relative, maximum = MAX_FILE) {
  const filename = regularPath(root, relative);
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd, {bigint:true});
    assert.ok(before.isFile() && before.size <= BigInt(maximum), 'file size/type');
    const buffer = Buffer.alloc(Number(before.size) + 1);
    let used = 0, reads = 0;
    while (used < buffer.length) {
      assert.ok(++reads <= Math.ceil(maximum / 4096) + 2, 'fragmented read budget');
      const count = fs.readSync(fd, buffer, used, buffer.length - used, null);
      if (count === 0) break;
      used += count;
    }
    assert.equal(used, Number(before.size), 'file grew or shrank during read');
    const after = fs.fstatSync(fd, {bigint:true});
    const named = fs.lstatSync(filename, {bigint:true});
    for (const key of ['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs']) {
      assert.equal(after[key], before[key], 'file generation changed');
      assert.equal(named[key], before[key], 'pathname generation changed');
    }
    return {bytes:buffer.subarray(0, used), mode:(Number(before.mode) & 0o111) ? '100755' : '100644'};
  } finally { fs.closeSync(fd); }
}

function sourceFiles(root) {
  const files = [];
  let entries = 0;
  function walk(relative, depth) {
    assert.ok(depth <= 32, 'source depth');
    const directory = regularPath(root, relative);
    assert.ok(fs.lstatSync(directory).isDirectory(), 'source directory');
    for (const name of fs.readdirSync(directory).sort()) {
      assert.ok(++entries <= MAX_FILES, 'source entry count');
      const child = relative + '/' + name;
      const stat = fs.lstatSync(path.join(root, child));
      if (stat.isDirectory()) walk(child, depth + 1);
      else { assert.ok(stat.isFile(), 'nonregular source'); files.push(child); }
    }
  }
  walk('src', 0);
  return files.sort();
}

function assertCheckout(root, expectedHead) {
  assert.ok([22,24,26].includes(Number(process.versions.node.split('.')[0])), 'unsupported Node');
  assert.match(expectedHead, /^[0-9a-f]{40}$/, 'explicit exact checkout SHA required');
  assert.equal(fs.realpathSync(root), root, 'physical repository root required');
  assert.equal(git(root, 'rev-parse', '--show-toplevel').toString().trim(), root, 'Git root mismatch');
  assert.equal(git(root, 'rev-parse', '--show-object-format').toString().trim(), 'sha1');
  assert.equal(git(root, 'rev-parse', 'HEAD').toString().trim(), expectedHead, 'checkout head drift');
  git(root, 'merge-base', '--is-ancestor', HISTORICAL_HEAD, expectedHead);
  assert.equal(git(root, 'status', '--porcelain=v1', '--untracked-files=all').length, 0, 'dirty checkout');
  assert.ok(!fs.existsSync(path.join(root, '.dockerignore')) &&
    !fs.readdirSync(root).includes('.dockerignore'), 'unreviewed dockerignore');
}

function historicalLock(root) {
  for (const relative of LEGACY_TOOLS) {
    assert.deepEqual(readRegular(root, relative).bytes,
      git(root, 'show', `${HISTORICAL_HEAD}:${relative}`), 'historical lock/verifier changed');
  }
  const bytes = readRegular(root, MANIFEST).bytes;
  const lock = JSON.parse(bytes);
  const {enforcement_artifact_set_sha256, ...body} = lock;
  assert.equal(digest(canonical(body)), enforcement_artifact_set_sha256, 'historical manifest digest');
  assert.equal(lock.source_head, HISTORICAL_SOURCE);
  assert.equal(lock.artifacts.length, 23);
  return {lock, bytes};
}

export function snapshot(root, expectedHead) {
  root = path.resolve(root);
  assertCheckout(root, expectedHead);
  const {lock, bytes:manifestBytes} = historicalLock(root);
  const wanted = ['src', ...BUILD_INPUTS, ...VERIFIER_INPUTS];
  const entries = git(root, 'ls-tree', '-r', '-z', expectedHead, '--', ...wanted).toString().split('\0').filter(Boolean);
  assert.ok(entries.length > 0 && entries.length <= MAX_FILES, 'tracked input count');
  let total = 0;
  const records = entries.map(entry => {
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(entry);
    assert.ok(match, 'unsupported input mode/type');
    const [, mode, oid, relative] = match;
    const observed = readRegular(root, relative);
    total += observed.bytes.length;
    assert.ok(total <= MAX_TOTAL, 'total input byte limit');
    assert.equal(observed.mode, mode, 'input executable mode drift');
    const blob = crypto.createHash('sha1').update(`blob ${observed.bytes.length}\0`).update(observed.bytes).digest('hex');
    assert.equal(blob, oid, 'working input differs from selected commit blob');
    return {path:relative, mode, git_blob_sha1:oid, bytes:observed.bytes.length, sha256:digest(observed.bytes)};
  }).sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const sources = records.filter(r => r.path.startsWith('src/'));
  assert.deepEqual(sourceFiles(root), sources.map(r => r.path), 'untracked or ignored compiler source');
  const byPath = new Map(records.map(r => [r.path, r]));
  for (const relative of [...BUILD_INPUTS, ...VERIFIER_INPUTS]) assert.ok(byPath.has(relative), 'missing bound input');
  // All explicit V1 closure sources and build inputs remain locked. A new source
  // snapshot is not permission to change enforcement or its compiler/build recipe.
  for (const input of lock.inputs) {
    const current = byPath.get(input.path);
    assert.ok(current, 'missing historical input');
    for (const key of ['bytes', 'sha256', 'git_blob_sha1']) assert.equal(current[key], input[key], 'historical input drift');
  }
  const sourceTree = git(root, 'rev-parse', `${expectedHead}:src`).toString().trim();
  const body = {
    schema:'void_buy_void_enforcement_build_source_v2', version:2, repository:'6ZoSo9/void-node',
    checkout_head:expectedHead, checkout_tree:git(root, 'rev-parse', `${expectedHead}^{tree}`).toString().trim(),
    source_tree:sourceTree, source_files:sources,
    build_inputs:BUILD_INPUTS.map(p => byPath.get(p)), verifier_inputs:VERIFIER_INPUTS.map(p => byPath.get(p)),
    historical_reference:{reviewed_head:HISTORICAL_HEAD, source_head:HISTORICAL_SOURCE,
      source_tree:lock.source_tree, manifest_path:MANIFEST, manifest_sha256:digest(manifestBytes),
      enforcement_artifact_set_sha256:lock.enforcement_artifact_set_sha256},
    historical_full_source_generation_preserved:sourceTree === lock.source_tree,
    production_source_finality_authority_ready:false, deployed_artifact_generation_verified:false,
  };
  assertCheckout(root, expectedHead);
  return {...body, source_snapshot_sha256:digest(canonical(body))};
}

export async function derive(root, expectedHead, beforeBuild, artifactRoot = root) {
  root = path.resolve(root); artifactRoot = path.resolve(artifactRoot);
  assert.equal(fs.realpathSync(artifactRoot), artifactRoot, 'physical artifact root required');
  assert.equal(canonical(snapshot(root, expectedHead)), canonical(beforeBuild), 'build source snapshot mismatch');
  const {lock} = historicalLock(root);
  for (const input of [lock.compiler.typescript_js, lock.compiler.tsc_js]) {
    const current = readRegular(root, input.path).bytes;
    assert.equal(current.length, input.bytes, 'compiler size drift');
    assert.equal(digest(current), input.sha256, 'compiler byte drift');
  }
  const legacy = await import(pathToFileURL(path.join(root, LEGACY_TOOLS[1])).href);
  const artifacts = legacy.closure(artifactRoot);
  assert.equal(canonical(artifacts), canonical(lock.artifacts), 'historical enforcement closure changed');
  assert.equal(canonical(snapshot(root, expectedHead)), canonical(beforeBuild), 'post-verification source drift');
  const body = {
    schema:'void_buy_void_enforcement_build_generation_v2', version:2,
    source_snapshot:beforeBuild, artifacts, compiler:lock.compiler, build_command:lock.build_command,
    enforcement_artifact_set_sha256:lock.enforcement_artifact_set_sha256,
    historical_enforcement_artifact_bytes_preserved:true,
    historical_full_source_generation_preserved:beforeBuild.historical_full_source_generation_preserved,
    current_build_source_bound:true, derivation_node_majors:[22,24,26],
    external_dependency_boundary:lock.external_dependency_boundary,
    independently_accepted:false, deployed_artifact_generation_verified:false,
    production_source_finality_authority_ready:false,
  };
  return {...body, build_generation_sha256:digest(canonical(body))};
}

export async function verify(root, expectedHead, beforeBuild, recorded, artifactRoot = root) {
  assert.equal(canonical(await derive(root, expectedHead, beforeBuild, artifactRoot)),
    canonical(recorded), 'recorded build generation mismatch');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  assert.ok(command === 'snapshot' || command === 'derive' || command === 'verify', 'invalid command');
  const options = new Map();
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(['--expected-head', '--snapshot', '--record', '--packaged-root'].includes(args[i]) &&
      typeof args[i + 1] === 'string' && !args[i + 1].startsWith('--') && !options.has(args[i]), 'invalid or duplicate option');
    options.set(args[i], args[i + 1]);
  }
  assert.ok(options.has('--expected-head'), 'missing expected head');
  const head = options.get('--expected-head');
  if (command === 'snapshot') {
    assert.equal(options.size, 1);
    process.stdout.write(JSON.stringify(snapshot(ROOT, head), null, 2) + '\n');
  } else {
    assert.ok(options.has('--snapshot'), 'missing before-build snapshot');
    assert.equal(options.has('--record'), command === 'verify');
    const jsonFile = filename => JSON.parse(readRegular(path.dirname(path.resolve(filename)), path.basename(filename), 8 * 1024 * 1024).bytes);
    const before = jsonFile(options.get('--snapshot'));
    if (command === 'derive') process.stdout.write(JSON.stringify(await derive(ROOT, head, before, options.get('--packaged-root') ?? ROOT), null, 2) + '\n');
    else {
      await verify(ROOT, head, before, jsonFile(options.get('--record')), options.get('--packaged-root') ?? ROOT);
      console.log('VOID_BUY_VOID_ENFORCEMENT_BUILD_GENERATION_V2_GREEN');
      console.log('production_source_finality_authority_ready=false;independently_accepted=false;deployed_artifact_generation_verified=false');
    }
  }
}
