#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

function cloneRepoAtDifferentPath(sourceRepo) {
  const destination = mkdtempSync(join(tmpdir(), 'void-public-fetch-proof-clone-'));
  rmSync(destination, { recursive: true, force: true });
  cpSync(sourceRepo, destination, { recursive: true });
  return destination;
}

function invariant(snapshot) {
  return {
    repository_identity_sha256: snapshot.repository_identity_sha256,
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
    origin_effective_fetch_count: snapshot.origin_effective_fetch_count,
    origin_effective_fetch_sha256: snapshot.origin_effective_fetch_sha256,
    origin_push_count: snapshot.origin_push_count,
    origin_push_sha256: snapshot.origin_push_sha256,
    prospective_public_fetch_count: snapshot.prospective_public_fetch_count,
    prospective_public_fetch_sha256: snapshot.prospective_public_fetch_sha256,
  };
}

function assertNoDedicatedRemote(repo) {
  const fetch = run(repo, 'git', ['config', '--local', '--get-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.url`], 1);
  const push = run(repo, 'git', ['config', '--local', '--get-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.pushurl`], 1);
  assert.equal(fetch.stdout, '');
  assert.equal(push.stdout, '');
}

function assertPrivateReceipt(path, expected) {
  const receipt = JSON.parse(readFileSync(path, 'utf8'));
  assert.deepEqual(receipt, expected);
  assert.equal(statSync(path).mode & 0o777, 0o600);
}

const repos = [];
const configRoot = mkdtempSync(join(tmpdir(), 'void-public-fetch-config-'));
const globalConfig = join(configRoot, 'global.gitconfig');
writeFileSync(globalConfig, '');
const previousGlobal = process.env.GIT_CONFIG_GLOBAL;
const previousNoSystem = process.env.GIT_CONFIG_NOSYSTEM;
process.env.GIT_CONFIG_GLOBAL = globalConfig;
process.env.GIT_CONFIG_NOSYSTEM = '1';

try {
  const repo = makeRepo();
  repos.push(repo);
  const before = inspectRepositoryTransportV1(repo);
  assert.match(before.repository_identity_sha256, /^[0-9a-f]{64}$/);
  assert.equal(before.canonical_origin_required, true);
  assert.equal(before.origin_repository, CANONICAL_ORIGIN_REPOSITORY_V1);
  assert.equal(before.dedicated_state, 'MISSING');
  assert.equal(before.dirty_count, 2);
  const plan = buildTransportPlanV1(before);
  assert.equal(plan.repository_identity_sha256, before.repository_identity_sha256);
  assert.equal(plan.mutation_required, true);

  const cloneA = makeRepo();
  repos.push(cloneA);
  const cloneB = cloneRepoAtDifferentPath(cloneA);
  repos.push(cloneB);
  const cloneASnapshot = inspectRepositoryTransportV1(cloneA);
  const cloneBSnapshot = inspectRepositoryTransportV1(cloneB);
  assert.equal(cloneASnapshot.head, cloneBSnapshot.head);
  assert.equal(cloneASnapshot.tree, cloneBSnapshot.tree);
  assert.equal(cloneASnapshot.worktree_status_sha256, cloneBSnapshot.worktree_status_sha256);
  assert.equal(cloneASnapshot.index_sha256, cloneBSnapshot.index_sha256);
  assert.equal(cloneASnapshot.refs_sha256, cloneBSnapshot.refs_sha256);
  assert.notEqual(cloneASnapshot.repository_identity_sha256, cloneBSnapshot.repository_identity_sha256);
  const cloneAPlan = buildTransportPlanV1(cloneASnapshot);
  const cloneBPlan = buildTransportPlanV1(cloneBSnapshot);
  assert.notEqual(cloneAPlan.plan_id_sha256, cloneBPlan.plan_id_sha256);
  assert.throws(() => applyTransportPlanV1(cloneB, cloneAPlan.plan_id_sha256), /transport plan changed before apply/);
  assertNoDedicatedRemote(cloneB);

  const applied = applyTransportPlanV1(repo, plan.plan_id_sha256);
  assert.equal(applied.outcome, 'TRANSPORT_CONFIGURED');
  assert.deepEqual(invariant(applied.after), invariant(before));
  assert.equal(git(repo, 'remote', 'get-url', '--all', PUBLIC_FETCH_REMOTE_V1), PUBLIC_FETCH_URL_V1);
  assert.equal(git(repo, 'remote', 'get-url', '--push', PUBLIC_FETCH_REMOTE_V1), PUBLIC_PUSH_URL_V1);

  const aligned = inspectRepositoryTransportV1(repo);
  assert.equal(aligned.dedicated_state, 'ALIGNED');
  const idempotent = applyTransportPlanV1(repo, buildTransportPlanV1(aligned).plan_id_sha256);
  assert.equal(idempotent.outcome, 'ALREADY_ALIGNED');
  assert.equal(idempotent.mutation_attempted, false);

  git(repo, 'config', '--local', '--replace-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.url`, 'ssh://example.invalid/repo.git');
  git(repo, 'config', '--local', '--replace-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.pushurl`, 'ssh://example.invalid/repo.git');
  const bad = inspectRepositoryTransportV1(repo);
  assert.equal(bad.dedicated_state, 'MISCONFIGURED');
  const repaired = applyTransportPlanV1(repo, buildTransportPlanV1(bad).plan_id_sha256);
  assert.equal(repaired.after.dedicated_state, 'ALIGNED');

  assert.throws(() => applyTransportPlanV1(repo, '0'.repeat(64)), /transport plan changed before apply/);

  const detachedRepo = makeRepo();
  repos.push(detachedRepo);
  git(detachedRepo, 'checkout', '--detach', '-q');
  assert.throws(() => inspectRepositoryTransportV1(detachedRepo), /exact main/);

  for (const canonicalOrigin of CANONICAL_ORIGIN_FETCH_URLS_V1) {
    const canonicalRepo = makeRepo(canonicalOrigin);
    repos.push(canonicalRepo);
    const snapshot = inspectRepositoryTransportV1(canonicalRepo);
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

  const prospectiveRewriteRepo = makeRepo();
  repos.push(prospectiveRewriteRepo);
  writeFileSync(globalConfig, '[url "ssh://example.invalid/rewritten.git"]\n\tinsteadOf = https://github.com/6ZoSo9/void-node.git\n');
  assert.throws(() => inspectRepositoryTransportV1(prospectiveRewriteRepo), /public fetch URL is rewritten/);
  assertNoDedicatedRemote(prospectiveRewriteRepo);
  writeFileSync(globalConfig, '');

  const originRewriteRepo = makeRepo('https://github.com/6ZoSo9/void-node.git');
  repos.push(originRewriteRepo);
  writeFileSync(globalConfig, '[url "ssh://example.invalid/rewritten.git"]\n\tinsteadOf = https://github.com/6ZoSo9/void-node.git\n');
  assert.throws(() => inspectRepositoryTransportV1(originRewriteRepo), /origin effective fetch URL/);
  assertNoDedicatedRemote(originRewriteRepo);
  writeFileSync(globalConfig, '');

  const nonLocalDedicatedRepo = makeRepo();
  repos.push(nonLocalDedicatedRepo);
  writeFileSync(globalConfig, `[remote "${PUBLIC_FETCH_REMOTE_V1}"]\n\turl = ${PUBLIC_FETCH_URL_V1}\n`);
  assert.throws(() => inspectRepositoryTransportV1(nonLocalDedicatedRepo), /non-local configuration/);
  assertNoDedicatedRemote(nonLocalDedicatedRepo);
  writeFileSync(globalConfig, '');

  const cliRepo = makeRepo();
  repos.push(cliRepo);
  const tool = new URL('../tools/void-node-fleet-public-fetch-transport-v1.mjs', import.meta.url).pathname;

  const unsafeDryOutput = join(cliRepo, 'unsafe-dry-run.json');
  const unsafeDry = run(process.cwd(), process.execPath, [tool, '--repo', cliRepo, '--output', unsafeDryOutput], 2);
  assert.equal(JSON.parse(unsafeDry.stdout).outcome, 'HOLD');
  assert.match(JSON.parse(unsafeDry.stdout).error, /output path must be outside selected worktree/);
  assert.equal(existsSync(unsafeDryOutput), false);
  assertNoDedicatedRemote(cliRepo);

  const unsafeGitOutput = join(git(cliRepo, 'rev-parse', '--absolute-git-dir'), 'unsafe-apply.json');
  const unsafePlanId = buildTransportPlanV1(inspectRepositoryTransportV1(cliRepo)).plan_id_sha256;
  const unsafeApply = run(process.cwd(), process.execPath, [
    tool, '--repo', cliRepo, '--output', unsafeGitOutput, '--apply',
    '--confirm-operation', VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,
    '--confirm-plan-id', unsafePlanId,
  ], 2);
  assert.equal(JSON.parse(unsafeApply.stdout).outcome, 'HOLD');
  assert.match(JSON.parse(unsafeApply.stdout).error, /output path must be outside selected worktree/);
  assert.equal(existsSync(unsafeGitOutput), false);
  assertNoDedicatedRemote(cliRepo);

  const preexistingApplyRepo = makeRepo();
  repos.push(preexistingApplyRepo);
  const preexistingApplyOutput = join(configRoot, 'preexisting-apply.json');
  writeFileSync(preexistingApplyOutput, 'do-not-overwrite\n');
  const preexistingApplyBytes = readFileSync(preexistingApplyOutput);
  const preexistingApplyPlanId = buildTransportPlanV1(inspectRepositoryTransportV1(preexistingApplyRepo)).plan_id_sha256;
  const preexistingApply = run(process.cwd(), process.execPath, [
    tool, '--repo', preexistingApplyRepo, '--output', preexistingApplyOutput, '--apply',
    '--confirm-operation', VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,
    '--confirm-plan-id', preexistingApplyPlanId,
  ], 2);
  assert.equal(JSON.parse(preexistingApply.stdout).outcome, 'HOLD');
  assert.match(JSON.parse(preexistingApply.stdout).error, /reserve create-only output receipt/);
  assert.deepEqual(readFileSync(preexistingApplyOutput), preexistingApplyBytes);
  assertNoDedicatedRemote(preexistingApplyRepo);

  const dryOutput = join(configRoot, 'cli-dry-run-result.json');
  const dry = run(process.cwd(), process.execPath, [tool, '--repo', cliRepo, '--output', dryOutput]);
  const dryResult = JSON.parse(dry.stdout);
  assertPrivateReceipt(dryOutput, dryResult);
  assert.equal(dry.stdout.includes('git@github.com'), false);
  assert.equal(dry.stdout.includes('example.invalid'), false);
  assert.equal(dry.stdout.includes(cliRepo), false);
  assert.match(dryResult.plan.repository_identity_sha256, /^[0-9a-f]{64}$/);
  assert.equal(dryResult.outcome, 'READY_TO_APPLY');
  assert.equal(dryResult.mutation_attempted, false);
  assert.equal(dryResult.authority.git_fetch, false);
  const cliPlanId = dryResult.plan.plan_id_sha256;
  const dryBytes = readFileSync(dryOutput);

  const duplicateOutput = run(process.cwd(), process.execPath, [tool, '--repo', cliRepo, '--output', dryOutput], 2);
  assert.equal(JSON.parse(duplicateOutput.stdout).outcome, 'HOLD');
  assert.deepEqual(readFileSync(dryOutput), dryBytes);
  assert.equal(inspectRepositoryTransportV1(cliRepo).dedicated_state, 'MISSING');

  const badConfirm = run(process.cwd(), process.execPath, [
    tool, '--repo', cliRepo, '--apply', '--confirm-operation', 'WRONG', '--confirm-plan-id', cliPlanId,
  ], 2);
  assert.equal(JSON.parse(badConfirm.stdout).outcome, 'HOLD');
  assert.equal(inspectRepositoryTransportV1(cliRepo).dedicated_state, 'MISSING');

  const applyOutput = join(configRoot, 'cli-apply-result.json');
  const appliedCli = run(process.cwd(), process.execPath, [
    tool, '--repo', cliRepo, '--output', applyOutput, '--apply',
    '--confirm-operation', VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,
    '--confirm-plan-id', cliPlanId,
  ]);
  const appliedResult = JSON.parse(appliedCli.stdout);
  assertPrivateReceipt(applyOutput, appliedResult);
  assert.equal(appliedResult.outcome, 'TRANSPORT_CONFIGURED');
  assert.equal(appliedResult.authority.git_config_mutation_attempted, true);
  assert.equal(appliedResult.authority.git_fetch, false);
  assert.equal(git(cliRepo, 'remote', 'get-url', '--all', PUBLIC_FETCH_REMOTE_V1), PUBLIC_FETCH_URL_V1);
  assert.equal(git(cliRepo, 'remote', 'get-url', '--push', PUBLIC_FETCH_REMOTE_V1), PUBLIC_PUSH_URL_V1);

  const alignedOutput = join(configRoot, 'cli-aligned-result.json');
  const alignedCli = run(process.cwd(), process.execPath, [tool, '--repo', cliRepo, '--output', alignedOutput]);
  const alignedResult = JSON.parse(alignedCli.stdout);
  assertPrivateReceipt(alignedOutput, alignedResult);
  assert.equal(alignedResult.outcome, 'ALREADY_ALIGNED');
  assert.equal(alignedResult.mutation_attempted, false);
  assert.equal(alignedResult.authority.git_fetch, false);

  const toolSource = readFileSync(tool, 'utf8');
  assert.equal(toolSource.includes("spawnSync('systemctl'"), false);
  assert.equal(toolSource.includes("spawnSync('curl'"), false);

  console.log('VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1_PROOF_GREEN');
  console.log('status=PASS');
  console.log('remote_name=void-public-fetch');
  console.log('fetch_url=https://github.com/6ZoSo9/void-node.git');
  console.log('push_url=/dev/null');
  console.log('canonical_origin_required=true');
  console.log('effective_origin_verified=true');
  console.log('effective_public_fetch_verified=true');
  console.log('instead_of_rewrite_rejected=true');
  console.log('non_local_dedicated_config_rejected=true');
  console.log('selected_worktree_identity_bound=true');
  console.log('cross_clone_plan_reuse_rejected=true');
  console.log('unsafe_worktree_output_rejected=true');
  console.log('unsafe_git_dir_output_rejected=true');
  console.log('preexisting_apply_output_rejected_before_mutation=true');
  console.log('operator_receipt_mode_0600=true');
  console.log('operator_receipt_create_only=true');
  console.log('operator_cli_journey_proven=true');
  console.log('dirty_worktree_preserved=true');
  console.log('origin_preserved=true');
  console.log('refs_preserved=true');
  console.log('idempotent=true');
  console.log('wrong_confirmation_rejected=true');
  console.log('git_fetch=false');
  console.log('service_mutation=false');
  console.log('runtime_mutation=false');
} finally {
  if (previousGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
  else process.env.GIT_CONFIG_GLOBAL = previousGlobal;
  if (previousNoSystem === undefined) delete process.env.GIT_CONFIG_NOSYSTEM;
  else process.env.GIT_CONFIG_NOSYSTEM = previousNoSystem;
  for (const repo of repos) rmSync(repo, { recursive: true, force: true });
  rmSync(configRoot, { recursive: true, force: true });
}
