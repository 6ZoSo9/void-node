#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  buildResolvedMap,
  findRepoRoot,
  git,
  readCanonicalJson,
  REGISTRY_PATH,
  INDEX_REGISTRY_PATH,
  RESOLVED_MARKER,
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

const repoRoot = findRepoRoot();
const beforeStatus = git(repoRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
const registryRead = readCanonicalJson(repoRoot, REGISTRY_PATH);
const indexRead = readCanonicalJson(repoRoot, INDEX_REGISTRY_PATH);
validateRegistry(registryRead.value, indexRead.value);

assert.equal(registryRead.value.marker, 'VOID_REPO_CARTOGRAPHY_V1');
assert.equal(registryRead.value.version, 1);
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
assert.equal(resolved1.domain_count, registryRead.value.domains.length);
assert.ok(/^[0-9a-f]{40}$/.test(resolved1.source_commit_sha));
assert.ok(/^[0-9a-f]{40}$/.test(resolved1.source_tree_sha));
assert.ok(resolved1.tracked_file_count > 100, 'tracked-file inventory unexpectedly small');
assert.deepEqual(resolved2, resolved1, 'resolved map must be deterministic on one checkout');

for (const domain of resolved1.domains) {
  assert.ok(domain.canonical_match_count > 0, `domain must resolve at least one canonical file: ${domain.id}`);
  assert.match(domain.canonical_identity_sha256, /^[0-9a-f]{64}$/);
  for (const selector of domain.selectors) {
    if (selector.required) assert.ok(selector.match_count > 0, `required selector empty: ${domain.id}`);
    assert.match(selector.tracked_identity_sha256, /^[0-9a-f]{64}$/);
  }
}

const buyVoid = buildDomainSection({ repoRoot, domainId: 'economic.buy-void', limit: 7 });
assert.equal(buyVoid.marker, SECTION_MARKER);
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

const malformedSelector = clone(registryRead.value);
malformedSelector.domains[0].selectors[0] = { type: 'glob', value: '**', required: true };
expectFailure(() => validateRegistry(malformedSelector, indexRead.value), /selector_type_invalid/);

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
console.log('unknown_relationships_fail_closed=true');
console.log('unknown_index_landmarks_fail_closed=true');
console.log('missing_required_paths_fail_closed=true');
console.log('source_mutation_performed=false');
