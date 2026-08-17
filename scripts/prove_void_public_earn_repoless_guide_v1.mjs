#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, '..');
const guidePath = path.join(repo, 'docs/public/void-public-earn-no-node-client-v1.md');
const clientRel = 'tools/void_public_earn_no_node_client_v1.mjs';
const clientPath = path.join(repo, clientRel);
const pinnedCommit = 'a8166e1539f45d333b9e83ca566e1c51efd0aa5c';
const expectedGitBlobSha1 = '99c0e081511d2ef9c19fb1d68fe0ee0298f0488d';
const coordinatorNodeId = 'c'.repeat(32);

function gitBlobSha1(bytes) {
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`, 'utf8'))
    .update(bytes)
    .digest('hex');
}

function extractHeredoc(markdown, invocation) {
  const at = markdown.indexOf(invocation);
  assert.notEqual(at, -1, `missing documented invocation: ${invocation}`);
  const marker = "<<'NODE'\n";
  const startMarker = markdown.indexOf(marker, at);
  assert.notEqual(startMarker, -1, `missing NODE heredoc after: ${invocation}`);
  const start = startMarker + marker.length;
  const end = markdown.indexOf('\nNODE\n', start);
  assert.notEqual(end, -1, `unterminated NODE heredoc after: ${invocation}`);
  return markdown.slice(start, end) + '\n';
}

function writePreload(root) {
  const preload = path.join(root, 'mock-fetch-preload.mjs');
  fs.writeFileSync(preload, `
import fs from 'node:fs';
function note(url) {
  const file = process.env.VOID_TEST_FETCH_LOG;
  if (file) fs.appendFileSync(file, String(url) + '\\n');
}
function abortError() {
  const error = new Error('mock fetch aborted');
  error.name = 'AbortError';
  return error;
}
globalThis.fetch = async (url, options = {}) => {
  note(url);
  const mode = process.env.VOID_TEST_FETCH_MODE || 'body';
  if (mode === 'hang') {
    return await new Promise((resolve, reject) => {
      const signal = options?.signal;
      if (signal?.aborted) return reject(abortError());
      const keepAlive = setInterval(() => {}, 1000);
      signal?.addEventListener('abort', () => {
        clearInterval(keepAlive);
        reject(abortError());
      }, { once: true });
    });
  }
  const headers = { get(name) {
    if (String(name).toLowerCase() !== 'content-length') return null;
    if (process.env.VOID_TEST_NO_CONTENT_LENGTH === '1') return null;
    if (process.env.VOID_TEST_DECLARED_LENGTH) return process.env.VOID_TEST_DECLARED_LENGTH;
    const bodyFile = process.env.VOID_TEST_BODY_FILE;
    return bodyFile ? String(fs.statSync(bodyFile).size) : null;
  }};
  if (mode === 'redirect') return { status: 302, ok: false, headers, body: null };
  if (mode === 'nonstream') return { status: 200, ok: true, headers, body: null };
  if (mode === 'status500') return { status: 500, ok: false, headers, body: null };
  const bodyFile = process.env.VOID_TEST_BODY_FILE;
  if (!bodyFile) throw new Error('VOID_TEST_BODY_FILE missing');
  const body = fs.readFileSync(bodyFile);
  return new Response(body, { status: 200, headers: process.env.VOID_TEST_NO_CONTENT_LENGTH === '1' ? {} : { 'content-length': process.env.VOID_TEST_DECLARED_LENGTH || String(body.length) } });
};
`, { mode: 0o600 });
  return preload;
}

function runSnippet({ script, preload, args, env = {}, timeoutMs = 15_000 }) {
  const result = spawnSync(process.execPath, ['--import', preload, script, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: timeoutMs,
    maxBuffer: 2 * 1024 * 1024,
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error,
  };
}

function fetchCount(file) {
  if (!fs.existsSync(file)) return 0;
  const text = fs.readFileSync(file, 'utf8').trim();
  return text ? text.split('\n').length : 0;
}

function assertAbsent(file, message) {
  assert.equal(fs.existsSync(file), false, message);
}

const markdown = fs.readFileSync(guidePath, 'utf8');
const downloadSnippet = extractHeredoc(
  markdown,
  'node --input-type=module - "$PUBLIC_HTTPS_BASE" "$CLIENT_FILE" <<\'NODE\'',
);
const statusSnippet = extractHeredoc(
  markdown,
  'node --input-type=module - "$PUBLIC_HTTPS_BASE" <<\'NODE\'',
);

for (const required of [pinnedCommit, expectedGitBlobSha1]) {
  assert.equal(markdown.includes(required), true, `guide binding missing: ${required}`);
}
assert.equal(markdown.includes('/download/void-public-earn-no-node-client-v1.mjs'), false, 'guide must not execute client bytes selected by Public Earn gateway');

const pinnedBytes = execFileSync('git', ['show', `${pinnedCommit}:${clientRel}`], { cwd: repo, maxBuffer: 2 * 1024 * 1024 });
const currentBytes = fs.readFileSync(clientPath);
assert.equal(gitBlobSha1(pinnedBytes), expectedGitBlobSha1, 'pinned commit client blob mismatch');
assert.equal(gitBlobSha1(currentBytes), expectedGitBlobSha1, 'current canonical client drifted from guide pin');
assert.equal(Buffer.compare(pinnedBytes, currentBytes), 0, 'pinned and current canonical client bytes differ');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'void-public-earn-repoless-guide-v1-'));
const preload = writePreload(root);
const downloadScript = path.join(root, 'download-snippet.mjs');
const statusScript = path.join(root, 'status-snippet.mjs');
fs.writeFileSync(downloadScript, downloadSnippet, { mode: 0o600 });
fs.writeFileSync(statusScript, statusSnippet, { mode: 0o600 });
execFileSync(process.execPath, ['--check', downloadScript]);
execFileSync(process.execPath, ['--check', statusScript]);

const canonicalBody = path.join(root, 'canonical-client.mjs');
const tamperedBody = path.join(root, 'tampered-client.mjs');
const oversizedBody = path.join(root, 'oversized-client.bin');
fs.writeFileSync(canonicalBody, pinnedBytes);
fs.writeFileSync(tamperedBody, Buffer.concat([pinnedBytes, Buffer.from('\n// tampered\n')]));
fs.writeFileSync(oversizedBody, Buffer.alloc(1024 * 1024 + 1, 0x61));

const unsafeOrigins = [
  'http://public.example',
  'http://172.32.1.2',
  'http://100.63.1.2',
  'http://100.128.1.2',
  'http://[::1]:8082',
  'https://user:pass@public.example',
  'https://public.example/path',
  'https://public.example?x=1',
  'https://public.example/#x',
];
for (let index = 0; index < unsafeOrigins.length; index += 1) {
  const output = path.join(root, `unsafe-${index}.mjs`);
  const log = path.join(root, `unsafe-${index}.log`);
  const run = runSnippet({
    script: downloadScript,
    preload,
    args: [unsafeOrigins[index], output],
    env: { VOID_TEST_BODY_FILE: canonicalBody, VOID_TEST_FETCH_LOG: log },
  });
  assert.notEqual(run.status, 0, `unsafe origin unexpectedly succeeded: ${unsafeOrigins[index]}`);
  assert.equal(fetchCount(log), 0, `unsafe origin performed network fetch: ${unsafeOrigins[index]}`);
  assertAbsent(output, `unsafe origin created executable: ${unsafeOrigins[index]}`);
}

const admittedOrigins = [
  'https://public.example',
  'http://127.0.0.1:8082',
  'http://10.0.0.5:8082',
  'http://192.168.1.5:8082',
  'http://172.31.1.5:8082',
  'http://100.64.1.5:8082',
  'http://host.ts.net:8082',
];
for (let index = 0; index < admittedOrigins.length; index += 1) {
  const output = path.join(root, `admitted-${index}.mjs`);
  const log = path.join(root, `admitted-${index}.log`);
  const run = runSnippet({
    script: downloadScript,
    preload,
    args: [admittedOrigins[index], output],
    env: { VOID_TEST_BODY_FILE: canonicalBody, VOID_TEST_FETCH_LOG: log },
  });
  assert.equal(run.status, 0, `admitted origin failed: ${admittedOrigins[index]}\n${run.stderr}`);
  assert.equal(fetchCount(log), 1, `admitted origin fetch count mismatch: ${admittedOrigins[index]}`);
  assert.equal(Buffer.compare(fs.readFileSync(output), pinnedBytes), 0, 'installed client bytes differ from pin');
  assert.equal(fs.statSync(output).mode & 0o777, 0o700, 'installed client mode must be 0700');
}

const tamperedOut = path.join(root, 'tampered-out.mjs');
let run = runSnippet({ script: downloadScript, preload, args: ['https://public.example', tamperedOut], env: { VOID_TEST_BODY_FILE: tamperedBody } });
assert.notEqual(run.status, 0, 'tampered client unexpectedly installed');
assertAbsent(tamperedOut, 'tampered client file created');

const oversizedOut = path.join(root, 'oversized-out.mjs');
run = runSnippet({ script: downloadScript, preload, args: ['https://public.example', oversizedOut], env: { VOID_TEST_BODY_FILE: oversizedBody, VOID_TEST_NO_CONTENT_LENGTH: '1' } });
assert.notEqual(run.status, 0, 'streamed oversized client unexpectedly installed');
assertAbsent(oversizedOut, 'oversized client file created');

const declaredOut = path.join(root, 'declared-out.mjs');
run = runSnippet({ script: downloadScript, preload, args: ['https://public.example', declaredOut], env: { VOID_TEST_BODY_FILE: canonicalBody, VOID_TEST_DECLARED_LENGTH: String(1024 * 1024 + 1) } });
assert.notEqual(run.status, 0, 'declared oversized client unexpectedly installed');
assertAbsent(declaredOut, 'declared oversized client file created');

for (const mode of ['redirect', 'nonstream']) {
  const output = path.join(root, `${mode}-out.mjs`);
  run = runSnippet({ script: downloadScript, preload, args: ['https://public.example', output], env: { VOID_TEST_BODY_FILE: canonicalBody, VOID_TEST_FETCH_MODE: mode } });
  assert.notEqual(run.status, 0, `${mode} client source unexpectedly succeeded`);
  assertAbsent(output, `${mode} client source created file`);
}

const existingOut = path.join(root, 'existing.mjs');
const existingLog = path.join(root, 'existing.log');
fs.writeFileSync(existingOut, 'keep-me', { mode: 0o600 });
run = runSnippet({ script: downloadScript, preload, args: ['https://public.example', existingOut], env: { VOID_TEST_BODY_FILE: canonicalBody, VOID_TEST_FETCH_LOG: existingLog } });
assert.notEqual(run.status, 0, 'existing output unexpectedly overwritten');
assert.equal(fetchCount(existingLog), 0, 'existing output should fail before fetch');
assert.equal(fs.readFileSync(existingOut, 'utf8'), 'keep-me', 'existing output changed');

const statusBody = path.join(root, 'participant-status.json');
fs.writeFileSync(statusBody, JSON.stringify({ marker: 'VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_V1', coordinator_node_id: coordinatorNodeId }));
for (const origin of ['https://public.example', 'http://127.0.0.1:8082', 'http://10.1.2.3:8082', 'http://peer.ts.net:8082']) {
  const log = path.join(root, `status-ok-${crypto.randomBytes(4).toString('hex')}.log`);
  run = runSnippet({ script: statusScript, preload, args: [origin], env: { VOID_TEST_BODY_FILE: statusBody, VOID_TEST_FETCH_LOG: log } });
  assert.equal(run.status, 0, `status origin failed: ${origin}\n${run.stderr}`);
  assert.equal(run.stdout, coordinatorNodeId, 'status coordinator ID mismatch');
  assert.equal(fetchCount(log), 1, 'status fetch count mismatch');
}
for (const origin of ['http://public.example', 'http://172.32.1.2', 'http://100.128.1.2', 'http://[::1]:8082', 'https://user@public.example', 'https://public.example/path']) {
  const log = path.join(root, `status-hold-${crypto.randomBytes(4).toString('hex')}.log`);
  run = runSnippet({ script: statusScript, preload, args: [origin], env: { VOID_TEST_BODY_FILE: statusBody, VOID_TEST_FETCH_LOG: log } });
  assert.notEqual(run.status, 0, `unsafe status origin unexpectedly succeeded: ${origin}`);
  assert.equal(fetchCount(log), 0, `unsafe status origin fetched: ${origin}`);
}

const statusOversized = path.join(root, 'participant-status-oversized.json');
fs.writeFileSync(statusOversized, Buffer.alloc(65537, 0x20));
run = runSnippet({ script: statusScript, preload, args: ['https://public.example'], env: { VOID_TEST_BODY_FILE: statusOversized, VOID_TEST_NO_CONTENT_LENGTH: '1' } });
assert.notEqual(run.status, 0, 'oversized participant status unexpectedly succeeded');
for (const mode of ['redirect', 'nonstream']) {
  run = runSnippet({ script: statusScript, preload, args: ['https://public.example'], env: { VOID_TEST_BODY_FILE: statusBody, VOID_TEST_FETCH_MODE: mode } });
  assert.notEqual(run.status, 0, `${mode} participant status unexpectedly succeeded`);
}

const deadlineStarted = Date.now();
run = runSnippet({ script: statusScript, preload, args: ['https://public.example'], env: { VOID_TEST_BODY_FILE: statusBody, VOID_TEST_FETCH_MODE: 'hang' }, timeoutMs: 12_000 });
const deadlineElapsed = Date.now() - deadlineStarted;
assert.notEqual(run.status, 0, 'hung participant status unexpectedly succeeded');
assert.equal(run.signal, null, 'proof harness killed deadline test instead of snippet settling');
assert.ok(deadlineElapsed >= 6_000 && deadlineElapsed < 11_000, `deadline settlement out of range: ${deadlineElapsed}`);

console.log('VOID_PUBLIC_EARN_REPOLESS_GUIDE_V1_PROOF_GREEN');
console.log('guide_snippets_executed=true');
console.log(`pinned_client_git_blob=${expectedGitBlobSha1}`);
console.log('unsafe_origin_zero_fetch=true');
console.log('tampered_client_file_created=false');
console.log('participant_status_byte_cap=65536');
console.log('client_download_byte_cap=1048576');
console.log('wallet_authority=false');
console.log('work_credit_mutation=false');
console.log('money_movement=false');
