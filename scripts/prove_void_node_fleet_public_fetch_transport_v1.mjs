#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  CANONICAL_ORIGIN_FETCH_URLS_V1,
  CANONICAL_ORIGIN_REPOSITORY_V1,
  PUBLIC_FETCH_REMOTE_V1,
  PUBLIC_FETCH_URL_V1,
  PUBLIC_PUSH_URL_V1,
  VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,
  applyTransportPlanV1,
  buildTransportPlanV1,
  inspectRepositoryTransportV1,
} from '../tools/void-node-fleet-public-fetch-transport-v1.mjs';

function run(cwd, command, args, expected = 0) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  assert.equal(result.status, expected, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result;
}

function git(repo, ...args) {
  return run(repo, 'git', args).stdout.trim();
}

function makeRepo(originUrl = 'git@github.com:6ZoSo9/void-node.git') {
  const repo = mkdtempSync(join(tmpdir(), 'void-public-fetch-proof-'));
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.name', 'VOID Proof');
  git(repo, 'config', 'user.email', 'proof@example.invalid');
  writeFileSync(join(repo, 'tracked.txt'), 'base\n');
  git(repo, 'add', '--', 'tracked.txt');
  git(repo, 'commit', '-q', '-m', 'base');
  git(repo, 'remote', 'add', 'origin', originUrl);
  git(repo, 'config', '--local', 'remote.origin.pushurl', 'ssh://git@github.com/6ZoSo9/void-node.git');
  writeFileSync(join(repo, 'tracked.txt'), 'dirty-worktree\n');
  writeFileSync(join(repo, 'untracked.txt'), 'untracked\n');
  return repo;
}

function invariant(snapshot) {
  return {
    branch: snapshot.branch,
    head: snapshot.head,
    tree: snapshot.tree,
    worktree_status_sha256: snapshot.worktree_status_sha256,
    dirty_count: snapshot.dirty_count,
    index_sha256: snapshot.index_sha256,
    refs_sha256: snapshot.refs_sha256,
    canonical_origin_required: snapshot.canonical_origin_required,
    origin_repository: snapshot.origin_repository,
    origin_fetch_count: snapshot.origin_fetch_count,
    origin_fetch_sha256: snapshot.origin_fetch_sha256,
    origin_push_count: snapshot.origin_push_count,
    origin_push_sha256: snapshot.origin_push_sha256,
  };
}

function assertNoDedicatedRemote(repo) {
  const fetch = run(repo, 'git', ['config', '--local', '--get-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.url`], 1);
  const push = run(repo, 'git', ['config', '--local', '--get-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.pushurl`], 1);
  assert.equal(fetch.stdout, '');
  assert.equal(push.stdout, '');
}

const repos = [];
try {
  const repo = makeRepo();
  repos.push(repo);
  const before = inspectRepositoryTransportV1(repo);
  assert.equal(before.canonical_origin_required, true);
  assert.equal(before.origin_repository, CANONICAL_ORIGIN_REPOSITORY_V1);
  assert.equal(before.dedicated_state, 'MISSING');
  assert.equal(before.dirty_count, 2);
  const plan = buildTransportPlanV1(before);
  assert.equal(plan.mutation_required, true);
  assert.equal(plan.operation, 'configure_dedicated_fetch_remote_only');

  const applied = applyTransportPlanV1(repo, plan.plan_id_sha256);
  assert.equal(applied.outcome, 'TRANSPORT_CONFIGURED');
  assert.equal(applied.mutation_attempted, true);
  assert.deepEqual(invariant(applied.after), invariant(before));
  assert.equal(git(repo, 'config', '--local', '--get-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.url`), PUBLIC_FETCH_URL_V1);
  assert.equal(git(repo, 'config', '--local', '--get-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.pushurl`), PUBLIC_PUSH_URL_V1);
  assert.equal(git(repo, 'remote', 'get-url', 'origin'), 'git@github.com:6ZoSo9/void-node.git');
  assert.equal(git(repo, 'remote', 'get-url', '--push', 'origin'), 'ssh://git@github.com/6ZoSo9/void-node.git');

  const aligned = inspectRepositoryTransportV1(repo);
  const alignedPlan = buildTransportPlanV1(aligned);
  assert.equal(aligned.dedicated_state, 'ALIGNED');
  assert.equal(alignedPlan.mutation_required, false);
  const idempotent = applyTransportPlanV1(repo, alignedPlan.plan_id_sha256);
  assert.equal(idempotent.outcome, 'ALREADY_ALIGNED');
  assert.equal(idempotent.mutation_attempted, false);
  assert.deepEqual(invariant(idempotent.after), invariant(aligned));

  git(repo, 'config', '--local', '--replace-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.url`, 'ssh://example.invalid/repo.git');
  git(repo, 'config', '--local', '--replace-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.pushurl`, 'ssh://example.invalid/repo.git');
  const bad = inspectRepositoryTransportV1(repo);
  assert.equal(bad.dedicated_state, 'MISCONFIGURED');
  const repair = buildTransportPlanV1(bad);
  const repaired = applyTransportPlanV1(repo, repair.plan_id_sha256);
  assert.equal(repaired.outcome, 'TRANSPORT_CONFIGURED');
  assert.equal(repaired.after.dedicated_state, 'ALIGNED');
  assert.deepEqual(invariant(repaired.after), invariant(bad));

  assert.throws(() => applyTransportPlanV1(repo, '0'.repeat(64)), /transport plan changed before apply/);

  const detachedRepo = makeRepo();
  repos.push(detachedRepo);
  git(detachedRepo, 'checkout', '--detach', '-q');
  assert.throws(() => inspectRepositoryTransportV1(detachedRepo), /exact main/);

  for (const canonicalOrigin of CANONICAL_ORIGIN_FETCH_URLS_V1) {
    const canonicalRepo = makeRepo(canonicalOrigin);
    repos.push(canonicalRepo);
    const snapshot = inspectRepositoryTransportV1(canonicalRepo);
    assert.equal(snapshot.canonical_origin_required, true);
    assert.equal(snapshot.origin_repository, CANONICAL_ORIGIN_REPOSITORY_V1);
  }

  const foreignRepo = makeRepo('git@github.com:someone-else/not-void-node.git');
  repos.push(foreignRepo);
  assert.throws(() => inspectRepositoryTransportV1(foreignRepo), /canonical 6ZoSo9\/void-node/);
  assertNoDedicatedRemote(foreignRepo);

  const alternateHostRepo = makeRepo('https://example.invalid/6ZoSo9/void-node.git');
  repos.push(alternateHostRepo);
  assert.throws(() => inspectRepositoryTransportV1(alternateHostRepo), /canonical 6ZoSo9\/void-node/);
  assertNoDedicatedRemote(alternateHostRepo);

  const mixedRepo = makeRepo();
  repos.push(mixedRepo);
  git(mixedRepo, 'config', '--local', '--add', 'remote.origin.url', 'https://example.invalid/other/repo.git');
  assert.throws(() => inspectRepositoryTransportV1(mixedRepo), /exactly one canonical 6ZoSo9\/void-node/);
  assertNoDedicatedRemote(mixedRepo);

  const duplicateCanonicalRepo = makeRepo();
  repos.push(duplicateCanonicalRepo);
  git(duplicateCanonicalRepo, 'config', '--local', '--add', 'remote.origin.url', PUBLIC_FETCH_URL_V1);
  assert.throws(() => inspectRepositoryTransportV1(duplicateCanonicalRepo), /exactly one canonical 6ZoSo9\/void-node/);
  assertNoDedicatedRemote(duplicateCanonicalRepo);

  const cliRepo = makeRepo();
  repos.push(cliRepo);
  const tool = new URL('../tools/void-node-fleet-public-fetch-transport-v1.mjs', import.meta.url).pathname;
  const dry = run(process.cwd(), process.execPath, [tool, '--repo', cliRepo]);
  const dryResult = JSON.parse(dry.stdout);
  assert.equal(dry.stdout.includes('git@github.com'), false);
  assert.equal(dry.stdout.includes('example.invalid'), false);
  assert.equal(dryResult.outcome, 'READY_TO_APPLY');
  assert.equal(dryResult.plan.canonical_origin_required, true);
  assert.equal(dryResult.plan.origin_repository, CANONICAL_ORIGIN_REPOSITORY_V1);
  assert.equal(dryResult.mutation_attempted, false);
  assert.equal(dryResult.authority.git_fetch, false);
  assert.equal(dryResult.authority.service_mutation, false);
  assert.equal(dryResult.authority.runtime_mutation, false);
  const cliPlanId = dryResult.plan.plan_id_sha256;

  const badConfirm = run(process.cwd(), process.execPath, [
    tool, '--repo', cliRepo, '--apply',
    '--confirm-operation', 'WRONG',
    '--confirm-plan-id', cliPlanId,
  ], 2);
  assert.equal(JSON.parse(badConfirm.stdout).outcome, 'HOLD');
  assert.equal(inspectRepositoryTransportV1(cliRepo).dedicated_state, 'MISSING');

  const appliedCli = run(process.cwd(), process.execPath, [
    tool, '--repo', cliRepo, '--apply',
    '--confirm-operation', VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,
    '--confirm-plan-id', cliPlanId,
  ]);
  const appliedResult = JSON.parse(appliedCli.stdout);
  assert.equal(appliedResult.outcome, 'TRANSPORT_CONFIGURED');
  assert.equal(appliedResult.mutation_attempted, true);
  assert.equal(appliedResult.authority.git_config_mutation_attempted, true);
  assert.equal(appliedResult.authority.git_fetch, false);
  assert.equal(appliedResult.authority.service_mutation, false);
  assert.equal(appliedResult.authority.runtime_mutation, false);

  const toolSource = readFileSync(tool, 'utf8');
  assert.equal(toolSource.includes("spawnSync('systemctl'"), false);
  assert.equal(toolSource.includes("spawnSync('curl'"), false);

  console.log('VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1_PROOF_GREEN');
  console.log('status=PASS');
  console.log('remote_name=void-public-fetch');
  console.log('fetch_url=https://github.com/6ZoSo9/void-node.git');
  console.log('push_url=/dev/null');
  console.log('canonical_origin_required=true');
  console.log('foreign_origin_rejected=true');
  console.log('mixed_origin_rejected=true');
  console.log('dirty_worktree_preserved=true');
  console.log('origin_preserved=true');
  console.log('refs_preserved=true');
  console.log('idempotent=true');
  console.log('wrong_confirmation_rejected=true');
  console.log('git_fetch=false');
  console.log('service_mutation=false');
  console.log('runtime_mutation=false');
} finally {
  for (const repo of repos) rmSync(repo, { recursive: true, force: true });
}
