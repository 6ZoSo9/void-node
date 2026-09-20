#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
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

function makeRepo(baseFiles = {}, headFiles = {}) {
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

function resultFor(fixture, head = fixture.head) {
  return auditActionRefDelta({ cwd: fixture.repo, base: fixture.base, head });
}

const mutableCheckout = 'jobs:\n  test:\n    steps:\n      - uses: actions/checkout@v4\n';
const pinnedCheckout = `jobs:\n  test:\n    steps:\n      - uses: actions/checkout@${'a'.repeat(40)}\n`;
const pinnedSetup = `actions/setup-node@${'1'.repeat(40)}`;
const mutableComposite = 'name: local\nruns:\n  using: composite\n  steps:\n    - uses: actions/setup-node@v4\n';
const pinnedComposite = `name: local\nruns:\n  using: composite\n  steps:\n    - uses: ${pinnedSetup}\n`;

assert.deepEqual(classifyUsesRef('./.github/actions/local'), { kind: 'local', mutable: false });
assert.equal(classifyUsesRef('./ci/local').mutable, true);
assert.equal(classifyUsesRef('actions/checkout@v4').mutable, true);
assert.equal(classifyUsesRef(`actions/checkout@${'b'.repeat(40)}`).mutable, false);
assert.equal(classifyUsesRef(`owner/repo/.github/workflows/reuse.yml@${'b'.repeat(40)}`).mutable, false);
assert.deepEqual(classifyUsesRef('${{github.repository}}/action@' + 'b'.repeat(40)), {
  kind: 'remote_invalid',
  mutable: true,
});
assert.deepEqual(classifyUsesRef('owner/${{matrix.action}}@' + 'b'.repeat(40)), {
  kind: 'remote_invalid',
  mutable: true,
});
assert.equal(classifyUsesRef(`owner/repo/../action@${'b'.repeat(40)}`).mutable, true);
assert.equal(classifyUsesRef(`owner//action@${'b'.repeat(40)}`).mutable, true);
assert.equal(classifyUsesRef(`docker://alpine@sha256:${'c'.repeat(64)}`).mutable, false);
assert.deepEqual(
  classifyUsesRef(`docker://alpine@SHA256:${'c'.repeat(64)}`),
  { kind: 'docker_mutable', mutable: true },
);
assert.deepEqual(
  classifyUsesRef(`docker://alpine@sha256:${'C'.repeat(64)}`),
  { kind: 'docker_mutable', mutable: true },
);
assert.equal(
  classifyUsesRef(`docker://ghcr.io/void-network/proof@sha256:${'c'.repeat(64)}`).mutable,
  false,
);
assert.equal(
  classifyUsesRef(`docker://registry.example.com:5000/void/proof@sha256:${'c'.repeat(64)}`).mutable,
  false,
);
assert.equal(
  classifyUsesRef(`docker://registry.example.com:65535/void/proof@sha256:${'c'.repeat(64)}`).mutable,
  false,
);
assert.equal(
  classifyUsesRef(`docker://${'a'.repeat(63)}.example.com/void/proof@sha256:${'c'.repeat(64)}`).mutable,
  false,
);
for (const target of [
  '${{ github.repository }}',
  '../alpine',
  'ghcr.io//void/proof',
  'https://ghcr.io/void/proof',
  'ghcr.io/Void/proof',
  'registry.example.com:5000',
  'registry.example.com',
  'registry_name.example.com/void/proof',
  `${'a'.repeat(64)}.example.com/void/proof`,
  `${'a'.repeat(64)}.example.com:5000/void/proof`,
  'registry..example.com/void/proof',
  'registry.-example.com/void/proof',
  'registry.example-.com/void/proof',
  'registry..example.com:5000/void/proof',
  'registry.-example.com:5000/void/proof',
  'registry.example-.com:5000/void/proof',
  'registry.example.com:70000/void/proof',
  'registry.example.com:05000/void/proof',
]) {
  assert.deepEqual(
    classifyUsesRef(`docker://${target}@sha256:${'c'.repeat(64)}`),
    { kind: 'docker_invalid', mutable: true },
  );
}
assert.equal(classifyUsesRef('docker://alpine:3.20').mutable, true);

const blockScalar = extractUsesRefs('steps:\n  - run: |\n      echo "uses: actions/checkout@v4"\n  - uses: ./.github/actions/local\n');
assert.equal(blockScalar.length, 1);
assert.equal(blockScalar[0].ref, './.github/actions/local');

const usesBlockScalar = extractUsesRefs('steps:\n  - uses: |\n      actions/checkout@v4\n');
assert.equal(usesBlockScalar.length, 1);
assert.equal(usesBlockScalar[0].kind, 'unparsed_uses_syntax');
assert.equal(usesBlockScalar[0].mutable, true);

const alternateSyntax = extractUsesRefs(
  'steps:\n' +
  '  - "uses": actions/checkout@v4\n' +
  "  - 'uses': actions/setup-node@v4\n" +
  '  - "u\\u0073es": actions/cache@v4\n' +
  '  - { uses: actions/upload-artifact@v4 }\n' +
  '  - { "uses": "actions/download-artifact@v4" }\n',
);
assert.deepEqual(alternateSyntax.map((entry) => entry.ref), [
  'actions/checkout@v4',
  'actions/setup-node@v4',
  'actions/cache@v4',
  'actions/upload-artifact@v4',
  'actions/download-artifact@v4',
]);

const flowSequenceFirstMapping = extractUsesRefs(
  'jobs:\n  t:\n    steps: [ uses: actions/checkout@v4 ]\n',
);
assert.deepEqual(flowSequenceFirstMapping.map((entry) => entry.ref), [
  'actions/checkout@v4',
]);

const repos = [];
try {
  // Existing mutable reference is grandfathered when the same file only changes unrelated content.
  {
    const fixture = makeRepo(
      { '.github/workflows/a.yml': mutableCheckout },
      { '.github/workflows/a.yml': mutableCheckout + '      - run: echo ok\n' },
    );
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'GREEN');
    assert.equal(result.new_mutable_refs.length, 0);
    assert.equal(result.legacy_mutable_refs_observed, 1);
  }

  // A newly introduced mutable remote reference is held.
  {
    const fixture = makeRepo(
      { '.github/workflows/a.yml': mutableCheckout },
      { '.github/workflows/a.yml': mutableCheckout + '      - uses: actions/setup-node@v4\n' },
    );
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.uses === 'actions/setup-node@v4'), true);
  }

  // A compact flow sequence cannot hide its first mutable uses mapping entry.
  {
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml':
        'jobs:\n  t:\n    runs-on: ubuntu-latest\n    steps: [ uses: actions/checkout@v4 ]\n',
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.uses === 'actions/checkout@v4' && x.kind === 'remote_mutable'
    ), true);
  }

  // A dynamic remote target stays invalid even when its revision looks immutable.
  {
    const dynamicTarget = '${{github.repository}}/action@' + 'd'.repeat(40);
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml': `jobs:\n  t:\n    steps:\n      - uses: ${dynamicTarget}\n`,
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.kind === 'remote_invalid'), true);
  }

  // A digest must use the canonical lowercase algorithm and hexadecimal encoding.
  {
    const uppercaseDockerDigest =
      'docker://alpine@sha256:' + 'F'.repeat(64);
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml': `jobs:\n  t:\n    steps:\n      - uses: ${uppercaseDockerDigest}\n`,
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.kind === 'docker_mutable' && x.uses === uppercaseDockerDigest
    ), true);
  }

  // A digest does not make a dynamic Docker image target immutable.
  {
    const dynamicDocker = 'docker://${{ github.repository }}@sha256:' + 'e'.repeat(64);
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml': `jobs:\n  t:\n    steps:\n      - uses: ${dynamicDocker}\n`,
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.kind === 'docker_invalid'), true);
  }

  // Empty or hyphen-bounded registry labels are not canonical DNS labels.
  {
    const malformedRegistryLabelDocker =
      'docker://registry..example.com:5000/void/proof@sha256:' + 'f'.repeat(64);
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml': `jobs:\n  t:\n    steps:\n      - uses: ${malformedRegistryLabelDocker}\n`,
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.kind === 'docker_invalid' && x.uses === malformedRegistryLabelDocker
    ), true);
  }

  // Registry labels longer than the DNS 63-octet ceiling fail closed.
  {
    const overlongRegistryLabelDocker =
      `docker://${'a'.repeat(64)}.example.com/void/proof@sha256:` + 'f'.repeat(64);
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml': `jobs:\n  t:\n    steps:\n      - uses: ${overlongRegistryLabelDocker}\n`,
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.kind === 'docker_invalid' && x.uses === overlongRegistryLabelDocker
    ), true);
  }

  // A portless registry-like hostname uses DNS-label validation before repository parsing.
  {
    const malformedPortlessRegistryDocker =
      'docker://registry_name.example.com/void/proof@sha256:' + 'f'.repeat(64);
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml': `jobs:\n  t:\n    steps:\n      - uses: ${malformedPortlessRegistryDocker}\n`,
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.kind === 'docker_invalid' && x.uses === malformedPortlessRegistryDocker
    ), true);
  }

  // Leading-zero registry ports are noncanonical even when numerically in range.
  {
    const leadingZeroRegistryPortDocker =
      'docker://registry.example.com:05000/void/proof@sha256:' + 'e'.repeat(64);
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml': `jobs:\n  t:\n    steps:\n      - uses: ${leadingZeroRegistryPortDocker}\n`,
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.kind === 'docker_invalid' && x.uses === leadingZeroRegistryPortDocker
    ), true);
  }

  // A bare registry endpoint is not an image repository, even with a digest.
  {
    const registryOnlyDocker =
      'docker://registry.example.com:5000@sha256:' + 'e'.repeat(64);
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml': `jobs:\n  t:\n    steps:\n      - uses: ${registryOnlyDocker}\n`,
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.kind === 'docker_invalid' && x.uses === registryOnlyDocker
    ), true);
  }

  // Replacing a mutable ref with an immutable ref is green.
  {
    const fixture = makeRepo(
      { '.github/workflows/a.yml': mutableCheckout },
      { '.github/workflows/a.yml': pinnedCheckout },
    );
    repos.push(fixture.repo);
    assert.equal(resultFor(fixture).decision, 'GREEN');
  }

  // uses block scalar fails closed.
  {
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml': 'jobs:\n  t:\n    steps:\n      - uses: |\n          actions/setup-node@v4\n',
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs[0].kind, 'unparsed_uses_syntax');
  }

  // Changed composite action with mutable dependency is held.
  {
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml': 'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/local\n',
      '.github/actions/local/action.yml': mutableComposite,
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.path === '.github/actions/local/action.yml' && x.uses === 'actions/setup-node@v4'
    ), true);
  }

  // V73 dependency closure: a newly trusted pre-existing local action is re-audited.
  {
    const fixture = makeRepo({
      '.github/actions/local/action.yml': mutableComposite,
    }, {});
    repos.push(fixture.repo);
    write(fixture.repo, '.github/workflows/a.yml',
      'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/local\n');
    const head = commit(fixture.repo, 'new workflow references existing local action');
    const result = resultFor(fixture, head);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.path === '.github/actions/local/action.yml' && x.uses === 'actions/setup-node@v4'
    ), true);
  }

  // An already-trusted pre-existing local action remains grandfathered on unrelated changes.
  {
    const fixture = makeRepo({
      '.github/actions/local/action.yml': mutableComposite,
      '.github/workflows/a.yml': 'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/local\n',
    }, {});
    repos.push(fixture.repo);
    write(fixture.repo, '.github/workflows/a.yml',
      'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/local\n      - run: echo ok\n');
    const head = commit(fixture.repo, 'unrelated workflow step');
    assert.equal(resultFor(fixture, head).decision, 'GREEN');
  }

  // Nested local dependency closure reaches a mutable remote action.
  {
    const fixture = makeRepo({
      '.github/actions/outer/action.yml':
        'name: outer\nruns:\n  using: composite\n  steps:\n    - uses: ./.github/actions/inner\n',
      '.github/actions/inner/action.yml': mutableComposite,
    }, {});
    repos.push(fixture.repo);
    write(fixture.repo, '.github/workflows/a.yml',
      'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/outer\n');
    const head = commit(fixture.repo, 'trust nested local action');
    const result = resultFor(fixture, head);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.path === '.github/actions/inner/action.yml' && x.uses === 'actions/setup-node@v4'
    ), true);
  }

  // Nested local dependency closure is green when the full remote chain is immutable.
  {
    const fixture = makeRepo({
      '.github/actions/outer/action.yml':
        'name: outer\nruns:\n  using: composite\n  steps:\n    - uses: ./.github/actions/inner\n',
      '.github/actions/inner/action.yml': pinnedComposite,
    }, {});
    repos.push(fixture.repo);
    write(fixture.repo, '.github/workflows/a.yml',
      'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/outer\n');
    const head = commit(fixture.repo, 'trust pinned nested local action');
    assert.equal(resultFor(fixture, head).decision, 'GREEN');
  }

  // Missing local manifest fails closed.
  {
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml':
        'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/missing\n',
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.kind === 'local_action_manifest_missing'), true);
  }

  // Git wildcard syntax in a local Action path is treated literally, not as a pathspec.
  {
    const fixture = makeRepo({
      '.github/actions/safe/action.yml': pinnedComposite,
    }, {});
    repos.push(fixture.repo);
    const workflow = 'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/*\n';
    // Assert the intended input exists before testing the manifest boundary.
    assert.deepEqual(extractUsesRefs(workflow), [
      { line: 4, ref: './.github/actions/*', kind: 'local', mutable: false },
    ]);
    write(fixture.repo, '.github/workflows/a.yml', workflow);
    const head = commit(fixture.repo, 'reject wildcard local action path');
    const result = resultFor(fixture, head);
    assert.equal(result.changed_workflows.length, 1);
    assert.equal(result.changed_workflows[0].head_path, '.github/workflows/a.yml');
    assert.equal(result.changed_workflows[0].head_uses_refs, 1);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.kind === 'local_action_manifest_missing' &&
      x.uses === './.github/actions/*'
    ), true);
  }

  // Ambiguous action.yml + action.yaml fails closed.
  {
    const fixture = makeRepo({
      '.github/actions/local/action.yml': pinnedComposite,
      '.github/actions/local/action.yaml': pinnedComposite,
    }, {});
    repos.push(fixture.repo);
    write(fixture.repo, '.github/workflows/a.yml',
      'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/local\n');
    const head = commit(fixture.repo, 'trust ambiguous local action');
    const result = resultFor(fixture, head);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.kind === 'local_action_manifest_ambiguous'), true);
  }

  // Cyclic local dependency graph fails closed.
  {
    const fixture = makeRepo({
      '.github/actions/a/action.yml':
        'name: a\nruns:\n  using: composite\n  steps:\n    - uses: ./.github/actions/b\n',
      '.github/actions/b/action.yml':
        'name: b\nruns:\n  using: composite\n  steps:\n    - uses: ./.github/actions/a\n',
    }, {});
    repos.push(fixture.repo);
    write(fixture.repo, '.github/workflows/a.yml',
      'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/a\n');
    const head = commit(fixture.repo, 'trust cyclic local action');
    const result = resultFor(fixture, head);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.kind === 'local_action_cycle'), true);
  }

  // A pre-existing symlink manifest newly referenced by a workflow fails closed.
  {
    const fixture = makeRepo({}, {});
    repos.push(fixture.repo);
    write(fixture.repo, 'ci/evil.yml', mutableComposite);
    mkdirSync(join(fixture.repo, '.github/actions/local'), { recursive: true });
    symlinkSync('../../../ci/evil.yml', join(fixture.repo, '.github/actions/local/action.yml'));
    const baseWithSymlink = commit(fixture.repo, 'pre-existing symlink action');
    write(fixture.repo, '.github/workflows/a.yml',
      'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/local\n');
    const head = commit(fixture.repo, 'trust pre-existing symlink action');
    const result = auditActionRefDelta({ cwd: fixture.repo, base: baseWithSymlink, head });
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.kind === 'non_regular_action_manifest'), true);
  }

  // A changed workflow must be a regular Git file, not a symlink.
  {
    const fixture = makeRepo();
    repos.push(fixture.repo);
    write(fixture.repo, 'ci/evil.yml', mutableCheckout);
    mkdirSync(join(fixture.repo, '.github/workflows'), { recursive: true });
    symlinkSync('../../ci/evil.yml', join(fixture.repo, '.github/workflows/a.yml'));
    const head = commit(fixture.repo, 'add symlinked workflow');
    const result = resultFor(fixture, head);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) =>
      x.kind === 'non_regular_workflow' &&
      x.uses === '<non-regular-workflow>'
    ), true);
  }

  // A changed symlink manifest is independently held.
  {
    const fixture = makeRepo({}, {});
    repos.push(fixture.repo);
    write(fixture.repo, '.github/workflows/a.yml',
      'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/local\n');
    write(fixture.repo, 'ci/evil.yml', mutableComposite);
    mkdirSync(join(fixture.repo, '.github/actions/local'), { recursive: true });
    symlinkSync('../../../ci/evil.yml', join(fixture.repo, '.github/actions/local/action.yml'));
    const head = commit(fixture.repo, 'add symlinked action manifest');
    const result = resultFor(fixture, head);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.kind === 'non_regular_action_manifest'), true);
  }

  // Local references outside the approved Action root are rejected.
  {
    const fixture = makeRepo({}, {
      '.github/workflows/a.yml':
        'jobs:\n  t:\n    steps:\n      - uses: ./ci/local-action\n',
      'ci/local-action/action.yml': pinnedComposite,
    });
    repos.push(fixture.repo);
    const result = resultFor(fixture);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.kind === 'local_outside_approved_root'), true);
  }

  // Hard depth bound prevents unbounded local Action recursion.
  {
    const baseFiles = {};
    for (let i = 0; i <= 17; i += 1) {
      const next = i === 17
        ? pinnedComposite
        : `name: local-${i}\nruns:\n  using: composite\n  steps:\n    - uses: ./.github/actions/a${i + 1}\n`;
      baseFiles[`.github/actions/a${i}/action.yml`] = next;
    }
    const fixture = makeRepo(baseFiles, {});
    repos.push(fixture.repo);
    write(fixture.repo, '.github/workflows/a.yml',
      'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/a0\n');
    const head = commit(fixture.repo, 'trust overdeep local chain');
    const result = resultFor(fixture, head);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.kind === 'local_action_depth_exceeded'), true);
  }

  // Hard manifest-count bound prevents unbounded local Action closure.
  {
    const baseFiles = {
      '.github/actions/root/action.yml':
        'name: root\nruns:\n  using: composite\n  steps:\n' +
        Array.from({ length: 65 }, (_, i) => `    - uses: ./.github/actions/leaf${i}\n`).join(''),
    };
    for (let i = 0; i < 65; i += 1) {
      baseFiles[`.github/actions/leaf${i}/action.yml`] = pinnedComposite;
    }
    const fixture = makeRepo(baseFiles, {});
    repos.push(fixture.repo);
    write(fixture.repo, '.github/workflows/a.yml',
      'jobs:\n  t:\n    steps:\n      - uses: ./.github/actions/root\n');
    const head = commit(fixture.repo, 'trust oversized local action closure');
    const result = resultFor(fixture, head);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.new_mutable_refs.some((x) => x.kind === 'local_action_manifest_limit_exceeded'), true);
  }

  // CLI path remains deterministic and green for an immutable remote action.
  const toolPath = resolve(dirname(fileURLToPath(import.meta.url)), '../tools/void-github-actions-ref-guard-v1.mjs');
  const cliFixture = makeRepo({}, { '.github/workflows/a.yml': pinnedCheckout });
  repos.push(cliFixture.repo);
  const cli = run(process.cwd(), process.execPath, [
    toolPath, '--cwd', cliFixture.repo, '--base', cliFixture.base, '--head', cliFixture.head,
  ], 0);
  assert.match(cli.stdout, /decision=GREEN/);
  assert.match(cli.stdout, /dispatch_authority_verified=false/);
  assert.match(cli.stdout, /self_removal_protection_verified=false/);
  assert.match(cli.stdout, /independent_required_check_verified=false/);

  console.log('VOID_GITHUB_ACTIONS_REF_GUARD_V1_PROOF_GREEN');
} finally {
  for (const repo of repos) rmSync(repo, { recursive: true, force: true });
}