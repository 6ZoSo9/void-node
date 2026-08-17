#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const MARKER = 'VOID_REPO_CARTOGRAPHY_REVIEWED_GIT_EXECUTABLE_V1_PROOF_GREEN';
const GIT_PATH_ENV = 'VOID_REPO_CARTOGRAPHY_GIT_EXECUTABLE';
const GIT_SHA_ENV = 'VOID_REPO_CARTOGRAPHY_GIT_EXECUTABLE_SHA256';
const generator = path.resolve('scripts/generate_void_repo_cartography_v1.mjs');
const reviewer = path.resolve('scripts/review_void_repo_section_v1.mjs');

function digest(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function run(script, args, env) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20_000,
  });
}

const configured = process.env[GIT_PATH_ENV] || '/usr/bin/git';
assert.ok(path.isAbsolute(configured), 'reviewed Git executable must be absolute');
const reviewedGit = fs.realpathSync(configured);
assert.ok(fs.statSync(reviewedGit).isFile(), 'reviewed Git executable must be a file');
const reviewedSha = digest(reviewedGit);
if (process.env[GIT_SHA_ENV]) {
  assert.equal(
    process.env[GIT_SHA_ENV],
    reviewedSha,
    'workflow-provided reviewed Git digest must match executable bytes',
  );
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'void-cartography-git-id-v1-'));
try {
  const fakeDir = path.join(root, 'fake-bin');
  const sentinel = path.join(root, 'fake-git-invoked');
  fs.mkdirSync(fakeDir);
  const fakeGit = path.join(fakeDir, 'git');
  fs.writeFileSync(
    fakeGit,
    `#!/bin/sh\nprintf 'invoked\\n' >> ${JSON.stringify(sentinel)}\nprintf 'FAKE_GIT_SHOULD_NOT_RUN\\n'\nexit 91\n`,
    { mode: 0o755 },
  );

  const hostileEnv = {
    ...process.env,
    PATH: fakeDir,
    [GIT_PATH_ENV]: reviewedGit,
    [GIT_SHA_ENV]: reviewedSha,
  };

  const generated = run(generator, ['--format', 'json'], hostileEnv);
  assert.equal(generated.status, 0, generated.stderr);
  assert.equal(fs.existsSync(sentinel), false, 'ambient fake git must not execute');
  const packet = JSON.parse(generated.stdout);
  assert.equal(packet.source_snapshot_bound, true);
  assert.equal(packet.git_executable_identity_bound, true);
  assert.equal(packet.git_executable_path, reviewedGit);
  assert.equal(packet.git_executable_sha256, reviewedSha);
  assert.match(packet.git_executable_filesystem_identity_sha256, /^[0-9a-f]{64}$/);

  const viewed = run(
    reviewer,
    ['--domain', 'operations.coordination', '--limit', '5', '--format', 'json'],
    hostileEnv,
  );
  assert.equal(viewed.status, 0, viewed.stderr);
  assert.equal(fs.existsSync(sentinel), false, 'viewer must not execute ambient fake git');
  const section = JSON.parse(viewed.stdout);
  assert.equal(section.source_snapshot_bound, true);
  assert.equal(section.source_commit_sha, packet.source_commit_sha);
  assert.equal(section.source_tree_sha, packet.source_tree_sha);

  const missingBoundaryEnv = { ...process.env, PATH: fakeDir };
  delete missingBoundaryEnv[GIT_PATH_ENV];
  delete missingBoundaryEnv[GIT_SHA_ENV];
  const missing = run(generator, ['--format', 'json'], missingBoundaryEnv);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /git_executable_required/);
  assert.equal(
    fs.existsSync(sentinel),
    false,
    'missing explicit Git boundary must fail before ambient fake git',
  );

  const wrongDigestEnv = {
    ...hostileEnv,
    [GIT_SHA_ENV]: '0'.repeat(64),
  };
  const wrongDigest = run(generator, ['--format', 'json'], wrongDigestEnv);
  assert.notEqual(wrongDigest.status, 0);
  assert.match(wrongDigest.stderr, /git_executable_sha256_mismatch/);
  assert.equal(
    fs.existsSync(sentinel),
    false,
    'digest mismatch must fail before ambient fake git',
  );

  const relativeEnv = {
    ...hostileEnv,
    [GIT_PATH_ENV]: 'git',
  };
  const relative = run(generator, ['--format', 'json'], relativeEnv);
  assert.notEqual(relative.status, 0);
  assert.match(relative.stderr, /git_executable_must_be_absolute/);
  assert.equal(fs.existsSync(sentinel), false);

  console.log(MARKER);
  console.log(`reviewed_git_path=${reviewedGit}`);
  console.log(`reviewed_git_sha256=${reviewedSha}`);
  console.log('ambient_path_git_substitution_rejected=true');
  console.log('missing_git_identity_boundary_fails_before_git_read=true');
  console.log('wrong_git_digest_fails_before_git_read=true');
  console.log('generator_git_identity_bound=true');
  console.log('viewer_git_identity_bound=true');
  console.log('source_mutation_performed=false');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
