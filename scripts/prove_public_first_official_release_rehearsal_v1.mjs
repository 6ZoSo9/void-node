#!/usr/bin/env node
import fs from 'node:fs';

const MARKER = 'VOID_PUBLIC_FIRST_OFFICIAL_RELEASE_REHEARSAL_V1';
function fail(message) { console.error(`[FAIL] ${message}`); process.exit(1); }
function pass(message) { console.log(`[PASS] ${message}`); }
function need(file, needles = []) {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) if (!text.includes(needle)) fail(`${file} missing ${needle}`);
  pass(file);
  return text;
}
const files = [
  ['tools/void-first-official-release-rehearsal-v1.mjs', ['VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_CONTROL_V1', 'rollback-recovery-rehearsal']],
  ['ops/release/void-first-official-release-rehearsal-v1.sh', ['release_tag_publish=false', 'official_release_publish=false']],
  ['ops/security/public-first-official-release-rehearsal-v1-proof.sh', ['public-python-bytecode-hygiene-v1-proof.sh']],
  ['.github/workflows/public-first-official-release-rehearsal-v1.yml', ['workflow_dispatch', 'public-first-official-release-rehearsal-v1-proof']],
  ['release/rehearsal/public-first-official-release-rehearsal-v1.schema.json', ['VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_PACKET_V1']],
  ['docs/public/first-official-release-rehearsal-v1.md', ['rehearsal namespace']],
  ['docs/operators/first-official-release-rehearsal-v1.md', ['No official release is published']],
  ['docs/security/public-first-official-release-rehearsal-v1-threat-model.md', ['fail closed']],
  ['public/public-node/void-network/release-rehearsal-v1.json', ['implemented_proof_gated']],
  ['public/public-node/void-network/release-rehearsal-v1.html', ['First Official Release Rehearsal']],
];
const textByFile = new Map(files.map(([file, needles]) => [file, need(file, needles)]));
for (const [file, text] of textByFile) {
  for (const forbidden of ['gh release create', 'gh release upload', 'git tag -a', 'git push origin --tags', 'git push --tags']) {
    if (text.includes(forbidden)) fail(`${file} contains forbidden live-publication command: ${forbidden}`);
  }
}
pass('no-live-publication-command-contract');
for (const file of [
  'release/rehearsal/public-first-official-release-rehearsal-v1.schema.json',
  'release/rehearsal/templates/rehearsal-packet-v1.json',
  'release/rehearsal/templates/rehearsal-receipt-v1.json',
  'public/public-node/void-network/release-rehearsal-v1.json',
]) {
  try { JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`${file} is invalid JSON: ${error.message}`); }
  pass(`${file} JSON`);
}
const makefile = fs.readFileSync('Makefile', 'utf8');
for (const target of ['public-python-bytecode-hygiene-v1-proof:', 'public-first-official-release-rehearsal-v1-proof:']) {
  if (!makefile.includes(target)) fail(`Makefile missing ${target}`);
}
pass('makefile-wiring');
console.log(`${MARKER}_STATIC_GREEN`);
