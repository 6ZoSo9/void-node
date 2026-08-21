#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildResolvedMap,
  findRepoRoot,
  git,
  readCanonicalJson,
  readCommitBytes,
  REGISTRY_PATH,
  INDEX_REGISTRY_PATH,
  RESOLVED_MARKER,
  SNAPSHOT_KIND,
  sanitizedGitEnv,
  sha256,
  validateRegistry,
} from './generate_void_repo_cartography_v1.mjs';
import { buildDomainSection, SECTION_MARKER } from './review_void_repo_section_v1.mjs';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectFailure(fn, pattern) {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown, `expected failure matching ${pattern}`);
  assert.match(String(thrown?.message ?? thrown), pattern);
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value)}\n`);
}

function ordinaryGit(repo, args, { encoding = 'utf8' } = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding,
    env: sanitizedGitEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(`ordinary_git_failed args=${args.join(' ')} stderr=${String(result.stderr ?? '')}`);
  }
  return result.stdout;
}

function makeSnapshotFixture(sourceRepo, sourceCommit) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'void-repo-cartography-v1-'));
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  const archive = git(sourceRepo, ['archive', '--format=tar', sourceCommit], { encoding: null });
  const extracted = spawnSync('tar', ['-xf', '-', '-C', repo], {
    input: archive,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (extracted.status !== 0) {
    throw new Error(`fixture_archive_extract_failed ${extracted.stderr?.toString('utf8') ?? ''}`);
  }
  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.name', 'VOID Cartography Proof']);
  git(repo, ['config', 'user.email', 'void-cartography-proof@example.invalid']);
  git(repo, ['add', '--all']);
  git(repo, ['commit', '-q', '-m', 'fixture baseline']);
  return { root, repo, baseline: git(repo, ['rev-parse', 'HEAD']).trim() };
}

const repoRoot = findRepoRoot();
const beforeStatus = git(repoRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
const registryRead = readCanonicalJson(repoRoot, REGISTRY_PATH);
const indexRead = readCanonicalJson(repoRoot, INDEX_REGISTRY_PATH);
validateRegistry(registryRead.value, indexRead.value);

assert.equal(registryRead.value.marker, 'VOID_REPO_CARTOGRAPHY_V1');
assert.equal(registryRead.value.version, 1);
assert.equal(registryRead.value.contract.coordination_live_truth_requires_agents_and_github_control_plane, true);
assert.ok(registryRead.value.domains.length >= 30, 'expected at least 30 directory domains');

const requiredIds = [
  'core.runtime',
  'network.p2p',
  'network.bootstrap',
  'data.datanet',
  'economic.buy-void',
  'economic.work-credits',
  'validators',
  'agents.discovery',
  'agents.sdk',
  'agents.mcp',
  'operations.runtime',
  'operations.mainnet',
  'operations.coordination',
  'governance',
  'release',
  'security',
  'proofs',
  'ci',
];
const ids = new Set(registryRead.value.domains.map((domain) => domain.id));
for (const id of requiredIds) assert.ok(ids.has(id), `missing required domain ${id}`);

const resolved1 = buildResolvedMap({ repoRoot });
const resolved2 = buildResolvedMap({ repoRoot });
assert.equal(resolved1.marker, RESOLVED_MARKER);
assert.equal(resolved1.source_mutation_performed, false);
assert.equal(resolved1.source_snapshot_kind, SNAPSHOT_KIND);
assert.equal(resolved1.source_snapshot_bound, true);
assert.equal(resolved1.domain_count, registryRead.value.domains.length);
assert.ok(/^[0-9a-f]{40}$/.test(resolved1.source_commit_sha));
assert.ok(/^[0-9a-f]{40}$/.test(resolved1.source_tree_sha));
assert.ok(resolved1.tracked_file_count > 100, 'tracked-file inventory unexpectedly small');
assert.deepEqual(resolved2, resolved1, 'resolved map must be deterministic on one checkout');
assert.equal(resolved1.source_commit_sha, git(repoRoot, ['rev-parse', '--verify', 'HEAD^{commit}']).trim());
assert.equal(resolved1.source_tree_sha, git(repoRoot, ['rev-parse', `${resolved1.source_commit_sha}^{tree}`]).trim());
assert.equal(resolved1.registry_sha256, sha256(readCommitBytes(repoRoot, resolved1.source_commit_sha, REGISTRY_PATH)));
assert.equal(resolved1.index_registry_sha256, sha256(readCommitBytes(repoRoot, resolved1.source_commit_sha, INDEX_REGISTRY_PATH)));

for (const domain of resolved1.domains) {
  assert.ok(domain.canonical_match_count > 0, `domain must resolve at least one canonical file: ${domain.id}`);
  assert.match(domain.canonical_identity_sha256, /^[0-9a-f]{64}$/);
  for (const selector of domain.selectors) {
    if (selector.required) assert.ok(selector.match_count > 0, `required selector empty: ${domain.id}`);
    assert.match(selector.tracked_identity_sha256, /^[0-9a-f]{64}$/);
  }
}

const coordination = resolved1.domains.find((domain) => domain.id === 'operations.coordination');
assert.ok(coordination, 'operations.coordination domain missing');
assert.match(coordination.purpose, /AGENTS\.md/);
assert.match(coordination.purpose, /current GitHub coordination issue or its explicit successor/);
assert.match(coordination.purpose, /checked-in/i);
assert.ok(
  coordination.selectors.some((selector) => selector.type === 'exact' && selector.value === 'AGENTS.md' && selector.required === true),
  'operations.coordination must start from required AGENTS.md',
);

const repoMapDoc = readCommitBytes(repoRoot, resolved1.source_commit_sha, 'docs/REPO_MAP.md').toString('utf8');
assert.match(repoMapDoc, /Coordination precedence/);
assert.match(repoMapDoc, /current live GitHub coordination issue/);
assert.match(repoMapDoc, /explicit successor/);
assert.match(repoMapDoc, /pinned HEAD[\s*]+commit tree/);

const buyVoid = buildDomainSection({ repoRoot, domainId: 'economic.buy-void', limit: 7 });
assert.equal(buyVoid.marker, SECTION_MARKER);
assert.equal(buyVoid.source_snapshot_kind, SNAPSHOT_KIND);
assert.equal(buyVoid.source_snapshot_bound, true);
assert.equal(buyVoid.domain.id, 'economic.buy-void');
assert.ok(buyVoid.domain.canonical_files.total > 0);
assert.ok(buyVoid.domain.canonical_files.shown <= 7);
assert.ok(buyVoid.domain.discovery.proofs.shown <= 7);
assert.equal(buyVoid.arbitrary_registry_path_allowed, false);
assert.equal(buyVoid.arbitrary_repository_path_allowed, false);
assert.equal(buyVoid.source_mutation_performed, false);

const p2p = buildDomainSection({ repoRoot, domainId: 'network.p2p', limit: 5 });
assert.equal(p2p.domain.id, 'network.p2p');
assert.ok(p2p.domain.canonical_files.total > 0);
assert.ok(p2p.domain.index_landmarks.length === 0 || Array.isArray(p2p.domain.index_landmarks));

expectFailure(() => buildDomainSection({ repoRoot, domainId: 'missing.domain', limit: 5 }), /unknown_domain/);
expectFailure(() => buildDomainSection({ repoRoot, domainId: 'economic.buy-void', limit: 0 }), /limit_invalid/);
expectFailure(() => buildDomainSection({ repoRoot, domainId: 'economic.buy-void', limit: 101 }), /limit_invalid/);

const duplicate = clone(registryRead.value);
duplicate.domains.push(clone(duplicate.domains[0]));
expectFailure(() => validateRegistry(duplicate, indexRead.value), /duplicate_domain_id/);

const unknownRelated = clone(registryRead.value);
unknownRelated.domains[0].related_domains.push('does.not.exist');
expectFailure(() => validateRegistry(unknownRelated, indexRead.value), /unknown_related_domain/);

const unknownLandmark = clone(registryRead.value);
unknownLandmark.domains[0].index_landmarks.push('does.not.exist');
expectFailure(() => validateRegistry(unknownLandmark, indexRead.value), /unknown_index_landmark/);

const missingSelector = clone(registryRead.value);
missingSelector.domains[0].selectors = [{ type: 'exact', value: 'definitely/not/present.v1', required: true }];
expectFailure(() => buildResolvedMap({ repoRoot, registryOverride: missingSelector }), /required_selector_missing/);

const harmlessOverride = buildResolvedMap({ repoRoot, registryOverride: clone(registryRead.value) });
assert.equal(harmlessOverride.source_snapshot_bound, false, 'override evidence must never claim exact source binding');

const malformedSelector = clone(registryRead.value);
malformedSelector.domains[0].selectors[0] = { type: 'glob', value: '**', required: true };
expectFailure(() => validateRegistry(malformedSelector, indexRead.value), /selector_type_invalid/);

// Adversarial dirty-state, replacement-object, repository-selection, and checkout-race
// proof runs entirely in synthetic temporary repositories.
let fixture = null;
let foreignFixture = null;
try {
  fixture = makeSnapshotFixture(repoRoot, resolved1.source_commit_sha);
  const baselineResolved = buildResolvedMap({ repoRoot: fixture.repo });
  assert.equal(baselineResolved.source_snapshot_bound, true);

  // Dirty index + dirty working tree must not leak into evidence labeled with unchanged HEAD.
  const stagedOnly = path.join(fixture.repo, 'cartography-staged-only-proof.txt');
  fs.writeFileSync(stagedOnly, 'staged-only\n');
  git(fixture.repo, ['add', '--', 'cartography-staged-only-proof.txt']);
  const dirtyRegistryPath = path.join(fixture.repo, REGISTRY_PATH);
  const dirtyRegistry = JSON.parse(fs.readFileSync(dirtyRegistryPath, 'utf8'));
  dirtyRegistry.domains.find((domain) => domain.id === 'economic.buy-void').purpose = 'UNSTAGED PURPOSE MUST NOT LEAK';
  writeJson(dirtyRegistryPath, dirtyRegistry);

  const dirtyResolved = buildResolvedMap({ repoRoot: fixture.repo });
  assert.deepEqual(dirtyResolved, baselineResolved, 'dirty index/worktree must not change HEAD-bound cartography evidence');
  const dirtySection = buildDomainSection({ repoRoot: fixture.repo, domainId: 'economic.buy-void', limit: 100 });
  assert.notEqual(dirtySection.domain.purpose, 'UNSTAGED PURPOSE MUST NOT LEAK');
  assert.ok(!dirtySection.domain.canonical_files.paths.includes('cartography-staged-only-proof.txt'));

  git(fixture.repo, ['reset', '--hard', '-q', fixture.baseline]);
  git(fixture.repo, ['clean', '-fdq']);

  // Build a second commit with both curated-domain and tracked-path differences.
  const registryBPath = path.join(fixture.repo, REGISTRY_PATH);
  const registryB = JSON.parse(fs.readFileSync(registryBPath, 'utf8'));
  registryB.domains.find((domain) => domain.id === 'economic.buy-void').purpose += ' RACE_SNAPSHOT_B';
  writeJson(registryBPath, registryB);
  const probePath = 'src/economic/buy_void_cartography_race_probe_v1.ts';
  fs.writeFileSync(path.join(fixture.repo, probePath), 'export const VOID_CARTOGRAPHY_RACE_PROBE_V1 = true;\n');
  git(fixture.repo, ['add', '--', REGISTRY_PATH, probePath]);
  git(fixture.repo, ['commit', '-q', '-m', 'fixture snapshot B']);
  const snapshotB = git(fixture.repo, ['rev-parse', 'HEAD']).trim();
  const snapshotBRegistry = fs.readFileSync(path.join(fixture.repo, REGISTRY_PATH));
  git(fixture.repo, ['checkout', '--quiet', '--detach', fixture.baseline]);

  const baselineSection = buildDomainSection({ repoRoot: fixture.repo, domainId: 'economic.buy-void', limit: 100 });
  const racedSection = buildDomainSection({
    repoRoot: fixture.repo,
    domainId: 'economic.buy-void',
    limit: 100,
    _testOnlyAfterHeadPinned: ({ head }) => {
      assert.equal(head, fixture.baseline);
      git(fixture.repo, ['checkout', '--quiet', '--detach', snapshotB]);
    },
  });
  assert.equal(git(fixture.repo, ['rev-parse', 'HEAD']).trim(), snapshotB, 'race hook must move live checkout');
  assert.deepEqual(racedSection, baselineSection, 'domain section must stay on the one commit pinned before checkout movement');
  assert.equal(racedSection.source_commit_sha, fixture.baseline);
  assert.ok(!racedSection.domain.purpose.includes('RACE_SNAPSHOT_B'));
  assert.ok(!racedSection.domain.canonical_files.paths.includes(probePath));

  git(fixture.repo, ['checkout', '--quiet', '--detach', fixture.baseline]);

  // Ordinary Git honors replacement refs, but cartography commit-labeled reads must not.
  git(fixture.repo, ['replace', fixture.baseline, snapshotB]);
  const ordinaryReplacedRegistry = ordinaryGit(fixture.repo, ['show', `${fixture.baseline}:${REGISTRY_PATH}`], { encoding: null });
  assert.ok(Buffer.isBuffer(ordinaryReplacedRegistry));
  assert.deepEqual(ordinaryReplacedRegistry, snapshotBRegistry, 'replacement fixture must redirect ordinary Git object reads');
  assert.notDeepEqual(ordinaryReplacedRegistry, readCommitBytes(fixture.repo, fixture.baseline, REGISTRY_PATH));
  const replacementSafeResolved = buildResolvedMap({ repoRoot: fixture.repo });
  assert.deepEqual(replacementSafeResolved, baselineResolved, 'replacement refs must not alter commit-bound cartography');
  const replacementSafeSection = buildDomainSection({ repoRoot: fixture.repo, domainId: 'economic.buy-void', limit: 100 });
  assert.deepEqual(replacementSafeSection, baselineSection, 'replacement refs must not alter bounded section evidence');
  git(fixture.repo, ['replace', '-d', fixture.baseline]);

  // Ambient repository/object/config-selection variables must not redirect repo A to repo B.
  foreignFixture = makeSnapshotFixture(repoRoot, resolved1.source_commit_sha);
  const foreignRegistryPath = path.join(foreignFixture.repo, REGISTRY_PATH);
  const foreignRegistry = JSON.parse(fs.readFileSync(foreignRegistryPath, 'utf8'));
  foreignRegistry.domains.find((domain) => domain.id === 'economic.buy-void').purpose += ' FOREIGN_REPOSITORY_B';
  writeJson(foreignRegistryPath, foreignRegistry);
  git(foreignFixture.repo, ['add', '--', REGISTRY_PATH]);
  git(foreignFixture.repo, ['commit', '-q', '-m', 'foreign repository B']);

  const poisonKeys = [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_COMMON_DIR',
    'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_NAMESPACE',
    'GIT_CONFIG_PARAMETERS',
    'GIT_CONFIG_COUNT',
    'GIT_CONFIG_KEY_0',
    'GIT_CONFIG_VALUE_0',
  ];
  const saved = new Map(poisonKeys.map((key) => [key, process.env[key]]));
  try {
    process.env.GIT_DIR = path.join(foreignFixture.repo, '.git');
    process.env.GIT_WORK_TREE = foreignFixture.repo;
    process.env.GIT_COMMON_DIR = path.join(foreignFixture.repo, '.git');
    process.env.GIT_INDEX_FILE = path.join(foreignFixture.repo, '.git', 'index');
    process.env.GIT_OBJECT_DIRECTORY = path.join(foreignFixture.repo, '.git', 'objects');
    process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES = path.join(foreignFixture.repo, '.git', 'objects');
    process.env.GIT_NAMESPACE = 'foreign-proof';
    process.env.GIT_CONFIG_COUNT = '1';
    process.env.GIT_CONFIG_KEY_0 = 'core.worktree';
    process.env.GIT_CONFIG_VALUE_0 = foreignFixture.repo;
    process.env.GIT_CONFIG_PARAMETERS = "'core.worktree'='" + foreignFixture.repo.replaceAll("'", "'\\''") + "'";

    assert.equal(findRepoRoot(fixture.repo), fixture.repo, 'repo discovery must ignore ambient repository-selection state');
    const envSafeResolved = buildResolvedMap({ repoRoot: fixture.repo });
    assert.deepEqual(envSafeResolved, baselineResolved, 'ambient Git environment must not redirect cartography evidence');
    const envSafeSection = buildDomainSection({ repoRoot: fixture.repo, domainId: 'economic.buy-void', limit: 100 });
    assert.deepEqual(envSafeSection, baselineSection, 'bounded section must remain bound to selected repository A');
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
} finally {
  if (fixture?.root) fs.rmSync(fixture.root, { recursive: true, force: true });
  if (foreignFixture?.root) fs.rmSync(foreignFixture.root, { recursive: true, force: true });
}

const afterStatus = git(repoRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
assert.equal(afterStatus, beforeStatus, 'cartography proof must not mutate repository state');

console.log('VOID_REPO_CARTOGRAPHY_V1_PROOF_GREEN');
console.log(`source_commit_sha=${resolved1.source_commit_sha}`);
console.log(`source_tree_sha=${resolved1.source_tree_sha}`);
console.log(`tracked_file_count=${resolved1.tracked_file_count}`);
console.log(`domain_count=${resolved1.domain_count}`);
console.log('bounded_domain_viewer=true');
console.log('stable_domain_ids=true');
console.log('generated_locations=true');
console.log('pinned_head_snapshot=true');
console.log('dirty_checkout_head_binding=true');
console.log('domain_section_single_snapshot=true');
console.log('coordination_live_truth_precedence=true');
console.log('git_replacement_objects_ignored=true');
console.log('ambient_git_repository_selection_ignored=true');
console.log('unknown_relationships_fail_closed=true');
console.log('unknown_index_landmarks_fail_closed=true');
console.log('missing_required_paths_fail_closed=true');
console.log('source_mutation_performed=false');
