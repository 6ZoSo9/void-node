#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1 = 'VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1';
export const VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_PLAN_V1 = 'VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_PLAN_V1';
export const VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1 = 'VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1';
export const PUBLIC_FETCH_REMOTE_V1 = 'void-public-fetch';
export const PUBLIC_FETCH_URL_V1 = 'https://github.com/6ZoSo9/void-node.git';
export const PUBLIC_PUSH_URL_V1 = '/dev/null';
export const CANONICAL_ORIGIN_REPOSITORY_V1 = '6ZoSo9/void-node';
export const CANONICAL_ORIGIN_FETCH_URLS_V1 = Object.freeze([
  'https://github.com/6ZoSo9/void-node.git',
  'https://github.com/6ZoSo9/void-node',
  'git@github.com:6ZoSo9/void-node.git',
  'git@github.com:6ZoSo9/void-node',
  'ssh://git@github.com/6ZoSo9/void-node.git',
  'ssh://git@github.com/6ZoSo9/void-node',
]);

const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA64_RE = /^[0-9a-f]{64}$/;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const CANONICAL_ORIGIN_FETCH_URL_SET_V1 = new Set(CANONICAL_ORIGIN_FETCH_URLS_V1);

function fail(message, mutationAttempted = false) {
  const error = new Error(message);
  error.name = 'VoidFleetPublicFetchTransportError';
  error.mutationAttempted = mutationAttempted;
  throw error;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : stableJson(value));
  return createHash('sha256').update(bytes).digest('hex');
}

function exactString(value, label) {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} must be a non-empty string`);
  if (/[^\x20-\x7e]/.test(value)) fail(`${label} contains non-ASCII or control characters`);
  return value;
}

function safePath(value, label) {
  const path = exactString(value, label);
  if (path !== '.' && path !== '~' && !path.startsWith('./') && !path.startsWith('../') && !path.startsWith('~/') && !path.startsWith('/')) {
    fail(`${label} must be a local filesystem path`);
  }
  return path;
}

function expandPath(value) {
  if (value === '~') return homedir();
  if (value.startsWith('~/')) return resolve(homedir(), value.slice(2));
  return resolve(value);
}

function run(repo, args, options = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    timeout: options.timeoutMs ?? 10_000,
    maxBuffer: MAX_OUTPUT_BYTES,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_OPTIONAL_LOCKS: '0',
    },
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message || result.error) : '',
  };
}

function requiredRun(repo, args, label) {
  const result = run(repo, args);
  if (!result.ok) fail(`${label} failed`);
  return result.stdout;
}

function configValues(repo, key) {
  const result = run(repo, ['config', '--local', '--get-all', key]);
  if (result.status === 1 && !result.error) return [];
  if (!result.ok) fail(`unable to read ${key}`);
  return result.stdout.split(/\r?\n/).filter((line) => line.length > 0);
}

function digestStrings(values) {
  return sha256(values.map((value) => `${value.length}:${value}`).join('\n'));
}

function worktreeStatus(repo) {
  const result = run(repo, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  if (!result.ok) fail('unable to inspect worktree status');
  const bytes = Buffer.from(result.stdout, 'utf8');
  const dirtyCount = result.stdout.length === 0 ? 0 : result.stdout.split('\0').filter(Boolean).length;
  return { digest: sha256(bytes), dirty_count: dirtyCount };
}

function indexDigest(repo) {
  const gitDir = requiredRun(repo, ['rev-parse', '--absolute-git-dir'], 'resolve git dir').trim();
  const indexPath = resolve(gitDir, 'index');
  if (!existsSync(indexPath)) fail('repository index is missing');
  const stat = statSync(indexPath);
  if (!stat.isFile()) fail('repository index is not a regular file');
  if (stat.size > MAX_OUTPUT_BYTES * 8) fail('repository index is unexpectedly large');
  return sha256(readFileSync(indexPath));
}

function operationInProgress(repo) {
  const gitDir = requiredRun(repo, ['rev-parse', '--absolute-git-dir'], 'resolve git dir').trim();
  const blockers = ['index.lock', 'MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer'];
  return blockers.some((name) => existsSync(resolve(gitDir, name)));
}

function refsDigest(repo) {
  const output = requiredRun(
    repo,
    ['for-each-ref', '--format=%(refname)%00%(objectname)%00%(symref)'],
    'inspect refs',
  );
  return sha256(output);
}

function classifyDedicatedRemote(fetchValues, pushValues) {
  if (fetchValues.length === 0 && pushValues.length === 0) return 'MISSING';
  if (
    fetchValues.length === 1 &&
    fetchValues[0] === PUBLIC_FETCH_URL_V1 &&
    pushValues.length === 1 &&
    pushValues[0] === PUBLIC_PUSH_URL_V1
  ) return 'ALIGNED';
  return 'MISCONFIGURED';
}

function assertCanonicalOriginFetchV1(originFetch) {
  if (originFetch.length !== 1) {
    fail(`origin must have exactly one canonical ${CANONICAL_ORIGIN_REPOSITORY_V1} fetch URL`);
  }
  if (!CANONICAL_ORIGIN_FETCH_URL_SET_V1.has(originFetch[0])) {
    fail(`origin does not identify canonical ${CANONICAL_ORIGIN_REPOSITORY_V1}`);
  }
}

export function inspectRepositoryTransportV1(repoInput) {
  const repo = expandPath(safePath(repoInput, 'repo'));
  const inside = run(repo, ['rev-parse', '--is-inside-work-tree']);
  if (!inside.ok || inside.stdout.trim() !== 'true') fail('repo is not a Git working tree');
  if (operationInProgress(repo)) fail('a Git operation is in progress');

  const branchResult = run(repo, ['symbolic-ref', '--short', '-q', 'HEAD']);
  if (branchResult.status === 1 && !branchResult.error) fail('repo must be on exact main');
  if (!branchResult.ok) fail('inspect branch failed');
  const branch = branchResult.stdout.trim();
  if (branch !== 'main') fail('repo must be on exact main');

  const head = requiredRun(repo, ['rev-parse', 'HEAD'], 'inspect head').trim();
  const tree = requiredRun(repo, ['rev-parse', 'HEAD^{tree}'], 'inspect tree').trim();
  if (!SHA40_RE.test(head) || !SHA40_RE.test(tree)) fail('repo head/tree identity is invalid');

  const originFetch = configValues(repo, 'remote.origin.url');
  assertCanonicalOriginFetchV1(originFetch);
  const originPush = configValues(repo, 'remote.origin.pushurl');
  const dedicatedFetch = configValues(repo, `remote.${PUBLIC_FETCH_REMOTE_V1}.url`);
  const dedicatedPush = configValues(repo, `remote.${PUBLIC_FETCH_REMOTE_V1}.pushurl`);
  const status = worktreeStatus(repo);

  return Object.freeze({
    repo,
    branch,
    head,
    tree,
    worktree_status_sha256: status.digest,
    dirty_count: status.dirty_count,
    index_sha256: indexDigest(repo),
    refs_sha256: refsDigest(repo),
    canonical_origin_required: true,
    origin_repository: CANONICAL_ORIGIN_REPOSITORY_V1,
    origin_fetch_count: originFetch.length,
    origin_fetch_sha256: digestStrings(originFetch),
    origin_push_count: originPush.length,
    origin_push_sha256: digestStrings(originPush),
    dedicated_fetch_count: dedicatedFetch.length,
    dedicated_fetch_sha256: digestStrings(dedicatedFetch),
    dedicated_push_count: dedicatedPush.length,
    dedicated_push_sha256: digestStrings(dedicatedPush),
    dedicated_state: classifyDedicatedRemote(dedicatedFetch, dedicatedPush),
  });
}

function planPayload(snapshot) {
  return {
    marker: VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_PLAN_V1,
    remote_name: PUBLIC_FETCH_REMOTE_V1,
    fetch_url: PUBLIC_FETCH_URL_V1,
    push_url: PUBLIC_PUSH_URL_V1,
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
    dedicated_fetch_count: snapshot.dedicated_fetch_count,
    dedicated_fetch_sha256: snapshot.dedicated_fetch_sha256,
    dedicated_push_count: snapshot.dedicated_push_count,
    dedicated_push_sha256: snapshot.dedicated_push_sha256,
    dedicated_state: snapshot.dedicated_state,
    operation: 'configure_dedicated_fetch_remote_only',
  };
}

export function buildTransportPlanV1(snapshot) {
  const payload = planPayload(snapshot);
  return Object.freeze({
    ...payload,
    plan_id_sha256: sha256(payload),
    mutation_required: snapshot.dedicated_state !== 'ALIGNED',
  });
}

function invariantView(snapshot) {
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

export function applyTransportPlanV1(repoInput, expectedPlanId) {
  if (!SHA64_RE.test(String(expectedPlanId ?? ''))) fail('expected plan ID must be lowercase 64-hex');
  const before = inspectRepositoryTransportV1(repoInput);
  const plan = buildTransportPlanV1(before);
  if (plan.plan_id_sha256 !== expectedPlanId) fail('transport plan changed before apply');

  if (!plan.mutation_required) {
    return Object.freeze({
      outcome: 'ALREADY_ALIGNED',
      plan,
      mutation_attempted: false,
      mutation_succeeded: true,
      after: before,
    });
  }

  const first = run(before.repo, ['config', '--local', '--replace-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.url`, PUBLIC_FETCH_URL_V1]);
  if (!first.ok) fail('failed to set dedicated fetch URL; mutation outcome is uncertain and automatic retry is forbidden', true);
  const second = run(before.repo, ['config', '--local', '--replace-all', `remote.${PUBLIC_FETCH_REMOTE_V1}.pushurl`, PUBLIC_PUSH_URL_V1]);
  if (!second.ok) fail('failed to set dedicated push URL; partial dedicated-remote config may exist and requires fresh inspection', true);

  const after = inspectRepositoryTransportV1(before.repo);
  if (stableJson(invariantView(after)) !== stableJson(invariantView(before))) {
    fail('repository invariant changed during dedicated remote configuration', true);
  }
  if (after.dedicated_state !== 'ALIGNED') fail('dedicated remote did not reach exact aligned state', true);

  return Object.freeze({
    outcome: 'TRANSPORT_CONFIGURED',
    plan,
    mutation_attempted: true,
    mutation_succeeded: true,
    after,
  });
}

function publicPlan(plan) {
  return {
    marker: plan.marker,
    plan_id_sha256: plan.plan_id_sha256,
    remote_name: plan.remote_name,
    fetch_url: plan.fetch_url,
    push_url: plan.push_url,
    branch: plan.branch,
    head: plan.head,
    tree: plan.tree,
    dirty_count: plan.dirty_count,
    canonical_origin_required: plan.canonical_origin_required,
    origin_repository: plan.origin_repository,
    dedicated_state: plan.dedicated_state,
    mutation_required: plan.mutation_required,
    operation: plan.operation,
  };
}

function authorityState(overrides = {}) {
  return {
    git_config_mutation_attempted: false,
    git_fetch: false,
    git_pull: false,
    checkout: false,
    reset: false,
    merge: false,
    build: false,
    package_install: false,
    service_mutation: false,
    runtime_mutation: false,
    network_configuration: false,
    credential_read: false,
    wallet_or_signer: false,
    work_credit_or_validator_mutation: false,
    transaction: false,
    treasury_or_liquidity: false,
    funds_moved: false,
    ...overrides,
  };
}

function emit(value, outputPath = '') {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  if (outputPath) {
    const path = expandPath(safePath(outputPath, 'output'));
    writeFileSync(path, json, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    chmodSync(path, 0o600);
  }
  process.stdout.write(json);
}

function valueAfter(argv, index, label) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) fail(`${label} requires a value`);
  return value;
}

function parseArgs(argv) {
  const out = {
    repo: '',
    output: '',
    apply: false,
    confirmOperation: '',
    confirmPlanId: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--repo') out.repo = valueAfter(argv, i++, arg);
    else if (arg === '--output') out.output = valueAfter(argv, i++, arg);
    else if (arg === '--apply') out.apply = true;
    else if (arg === '--confirm-operation') out.confirmOperation = valueAfter(argv, i++, arg);
    else if (arg === '--confirm-plan-id') out.confirmPlanId = valueAfter(argv, i++, arg);
    else if (arg === '--help') {
      console.log('Usage: node tools/void-node-fleet-public-fetch-transport-v1.mjs --repo PATH [--output PATH] [--apply --confirm-operation VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1 --confirm-plan-id SHA256]');
      process.exit(0);
    } else fail(`unknown argument: ${arg}`);
  }
  if (!out.repo) fail('--repo is required');
  return out;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const snapshot = inspectRepositoryTransportV1(args.repo);
    const plan = buildTransportPlanV1(snapshot);

    if (!args.apply) {
      emit({
        marker: VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1,
        version: 1,
        outcome: plan.mutation_required ? 'READY_TO_APPLY' : 'ALREADY_ALIGNED',
        plan: publicPlan(plan),
        reasons: [],
        mutation_attempted: false,
        automatic_retry: false,
        required_confirmation_marker: VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,
        authority: authorityState(),
      }, args.output);
      return;
    }

    if (args.confirmOperation !== VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1) {
      fail('exact operation confirmation mismatch');
    }
    if (args.confirmPlanId !== plan.plan_id_sha256) fail('exact plan ID confirmation mismatch');

    const result = applyTransportPlanV1(args.repo, args.confirmPlanId);
    emit({
      marker: VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1,
      version: 1,
      outcome: result.outcome,
      plan: publicPlan(result.plan),
      reasons: [],
      mutation_attempted: result.mutation_attempted,
      mutation_succeeded: result.mutation_succeeded,
      automatic_retry: false,
      authority: authorityState({
        git_config_mutation_attempted: result.mutation_attempted,
      }),
    }, args.output);
  } catch (error) {
    const mutationAttempted = error?.mutationAttempted === true;
    emit({
      marker: VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1,
      version: 1,
      outcome: 'HOLD',
      error: String(error?.message || error),
      mutation_attempted: mutationAttempted,
      automatic_retry: false,
      authority: authorityState({
        git_config_mutation_attempted: mutationAttempted,
      }),
    });
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
