#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  auditActionRefDelta,
  classifyUsesRef,
  extractUsesRefs,
} from '../tools/void-github-actions-ref-guard-v1.mjs';

function run(cwd, command, args, expected = 0) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  assert.equal(result.status, expected, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result;
}

function write(repo, path, content) {
  const full = join(repo, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
}

function commit(repo, message) {
  run(repo, 'git', ['add', '--', '.']);
  run(repo, 'git', ['commit', '-m', message]);
  return run(repo, 'git', ['rev-parse', 'HEAD']).stdout.trim();
}

function makeRepo(baseFiles, headFiles) {
  const repo = mkdtempSync(join(tmpdir(), 'void-actions-ref-guard-'));
  run(repo, 'git', ['init', '-q']);
  run(repo, 'git', ['config', 'user.name', 'VOID Proof']);
  run(repo, 'git', ['config', 'user.email', 'proof@example.invalid']);
  write(repo, '.proof-sentinel', 'base\n');
  for (const [path, content] of Object.entries(baseFiles)) write(repo, path, content);
  const base = commit(repo, 'base');
  write(repo, '.proof-sentinel', 'head\n');
  for (const [path, content] of Object.entries(headFiles)) write(repo, path, content);
  const head = commit(repo, 'head');
  return { repo, base, head };
}

const mutableCheckout = 'jobs:\n  test:\n    steps:\n      - uses: actions/checkout@v4\n';
const pinnedCheckout = `jobs:\n  test:\n    steps:\n      - uses: actions/checkout@${'a'.repeat(40)}\n`;

assert.deepEqual(classifyUsesRef('./.github/actions/local'), { kind: 'local', mutable: false });
assert.equal(classifyUsesRef('actions/checkout@v4').mutable, true);
assert.equal(classifyUsesRef(`actions/checkout@${'b'.repeat(40)}`).mutable, false);
assert.equal(classifyUsesRef(`docker://alpine@sha256:${'c'.repeat(64)}`).mutable, false);
assert.equal(classifyUsesRef('docker://alpine:3.20').mutable, true);

const blockScalar = extractUsesRefs('steps:\n  - run: |\n      echo "uses: actions/checkout@v4"\n  - uses: ./local\n');
assert.equal(blockScalar.length, 1);
assert.equal(blockScalar[0].ref, './local');

const repos = [];
try {
  {
    const fixture = makeRepo({ '.github/workflows/a.yml': mutableCheckout }, { '.github/workflows/a.yml': mutableCheckout + '      - run: echo ok\n' });
    repos.push(fixture.repo);
    const result = auditActionRefDelta({ cwd: fixture.repo, base: fixture.base, head: fixture.head });
    assert.equal(result.decision, 'GREEN');
    assert.equal(result.new_mutable_refs.length, 0);
    assert.equal(result.legacy_mutable_refs_observed, 1);
  }

  {
    const fixture = makeRepo({ '.github/workflows/a.yml': mutableCheckout }, { '.github/workflows/a.yml': mutableCheckout + '      - uses: actions/setup-node@v4\n' });
    repos.push(fixture.repo);
    const result = auditActionRefDelta({ cwd: fixture.repo, base: fixture.base, head: fixture.head });
    assert.equal(result.decision, 'HOLD');
    assert.deepEqual(result.new_mutable_refs.map((x) => x.uses), ['actions/setup-node@v4']);
  }

  {
    const fixture = makeRepo({ '.github/workflows/a.yml': mutableCheckout }, { '.github/workflows/a.yml': pinnedCheckout });
    repos.push(fixture.repo);
    assert.equal(auditActionRefDelta({ cwd: fixture.repo, base: fixture.base, head: fixture.head }).decision, 'GREEN');
  }

  {
    const content = `jobs:\n  call:\n    uses: owner/repo/.github/workflows/build.yml@${'d'.repeat(40)}\n  local:\n    steps:\n      - uses: ./local\n      - uses: docker://alpine@sha256:${'e'.repeat(64)}\n`;
    const fixture = makeRepo({}, { '.github/workflows/new.yml': content });
    repos.push(fixture.repo);
    assert.equal(auditActionRefDelta({ cwd: fixture.repo, base: fixture.base, head: fixture.head }).decision, 'GREEN');
  }

  {
    const content = 'jobs:\n  call:\n    uses: owner/repo/.github/workflows/build.yml@main\n';
    const fixture = makeRepo({}, { '.github/workflows/new.yml': content });
    repos.push(fixture.repo);
    const result = auditActionRefDelta({ cwd: fixture.repo, base: fixture.base, head: fixture.head });
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs[0].kind, 'remote_mutable');
  }

  {
    const fixture = makeRepo({ '.github/workflows/a.yml': mutableCheckout }, { '.github/workflows/a.yml': mutableCheckout + '      - uses: actions/checkout@v4\n' });
    repos.push(fixture.repo);
    const result = auditActionRefDelta({ cwd: fixture.repo, base: fixture.base, head: fixture.head });
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.length, 1);
    assert.equal(result.new_mutable_refs[0].uses, 'actions/checkout@v4');
  }

  {
    const fixture = makeRepo({ '.github/workflows/old.yml': mutableCheckout }, {});
    repos.push(fixture.repo);
    run(fixture.repo, 'git', ['mv', '.github/workflows/old.yml', '.github/workflows/new.yml']);
    const renamedHead = commit(fixture.repo, 'rename');
    const result = auditActionRefDelta({ cwd: fixture.repo, base: fixture.base, head: renamedHead });
    assert.equal(result.decision, 'GREEN');
  }

  {
    const fixture = makeRepo({}, { '.github/workflows/a.yml': 'jobs:\n  t:\n    steps:\n      - uses: docker://alpine:3.20\n' });
    repos.push(fixture.repo);
    assert.equal(auditActionRefDelta({ cwd: fixture.repo, base: fixture.base, head: fixture.head }).decision, 'HOLD');
  }

  const toolPath = resolve(dirname(fileURLToPath(import.meta.url)), '../tools/void-github-actions-ref-guard-v1.mjs');
  const cliFixture = makeRepo({}, { '.github/workflows/a.yml': pinnedCheckout });
  repos.push(cliFixture.repo);
  const cli = run(process.cwd(), process.execPath, [toolPath, '--cwd', cliFixture.repo, '--base', cliFixture.base, '--head', cliFixture.head], 0);
  assert.match(cli.stdout, /decision=GREEN/);

  console.log('VOID_GITHUB_ACTIONS_REF_GUARD_V1_PROOF_GREEN');
} finally {
  for (const repo of repos) rmSync(repo, { recursive: true, force: true });
}
