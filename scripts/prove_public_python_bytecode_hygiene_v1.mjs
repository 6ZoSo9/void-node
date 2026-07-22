#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const MARKER = 'VOID_PUBLIC_PYTHON_BYTECODE_HYGIENE_V1';
function fail(message) { console.error(`[FAIL] ${message}`); process.exit(1); }
function pass(message) { console.log(`[PASS] ${message}`); }
function need(file, needle = null) {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
  if (needle && !fs.readFileSync(file, 'utf8').includes(needle)) fail(`${file} missing ${needle}`);
  pass(file);
}
need('.github/workflows/public-python-bytecode-hygiene-v1.yml', 'public-python-bytecode-hygiene-v1-proof');
need('ops/security/public-python-bytecode-hygiene-v1-proof.sh', 'PYTHONPYCACHEPREFIX');
need('ops/release/normalize-github-ssh-remote-v1.sh', 'BatchMode=yes');
const ignore = fs.readFileSync('.gitignore', 'utf8');
for (const needle of ['__pycache__/', '*.py[cod]', '*.pyd']) {
  if (!ignore.includes(needle)) fail(`.gitignore missing ${needle}`);
}
pass('.gitignore bytecode patterns');
const tracked = spawnSync('git', ['ls-files', '-z'], { encoding: 'buffer' });
if (tracked.status !== 0) fail('git ls-files failed');
const offenders = tracked.stdout.toString('utf8').split('\0').filter(Boolean).filter((name) =>
  name.split('/').includes('__pycache__') || /\.py[co]$/i.test(name) || /\.pyd$/i.test(name));
if (offenders.length) fail(`tracked Python bytecode: ${offenders.join(', ')}`);
pass('tracked-python-bytecode-zero');
console.log(`${MARKER}_STATIC_GREEN`);
