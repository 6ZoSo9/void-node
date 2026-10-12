#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PACKET_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_PACKET_V1';
const RECEIPT_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_STAGE_RECEIPT_V1';
const SUMMARY_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_RECEIPT_V1';
const TOOL_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_CONTROL_V1';
const REQUIRED_STAGES = [
  'immutable-publication-rehearsal',
  'candidate-promotion-rehearsal',
  'qualification-matrix-rehearsal',
  'independent-approval-rehearsal',
  'canary-rehearsal',
  'stable-promotion-rehearsal',
  'freeze-revoke-rehearsal',
  'rollback-recovery-rehearsal',
];
const QUALIFICATION_TARGETS = [
  'ubuntu-22.04-x64',
  'ubuntu-24.04-x64',
  'debian-12-x64',
  'windows-wsl2-ubuntu-24.04-x64',
  'upgrade-from-current-stable',
  'rollback-health-failure',
  'two-node-sync',
  'participant-ui-smoke',
];

function fail(message) { throw new Error(message); }
function say(message = '') { process.stdout.write(`${message}\n`); }
function shaBytes(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function shaFile(file) { return shaBytes(fs.readFileSync(file)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
function canonical(value) { return `${JSON.stringify(stable(value), null, 2)}\n`; }
function shaObject(value) { return shaBytes(Buffer.from(canonical(value))); }
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, canonical(value), { mode: 0o644 });
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function isHex(value, length) { return typeof value === 'string' && new RegExp(`^[0-9a-f]{${length}}$`).test(value); }
function isVersion(value) { return typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value); }
function safeAssetName(value) {
  return typeof value === 'string' && value.length > 0 && value.length < 256 && !value.includes('/') && !value.includes('\\') && value !== '.' && value !== '..';
}
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { out._.push(arg); continue; }
    const key = arg.slice(2);
    if (key.startsWith('no-')) { out[key.slice(3)] = false; continue; }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}
function required(args, key) {
  const value = args[key];
  if (typeof value !== 'string' || !value) fail(`--${key} is required`);
  return value;
}
function assertEmptyOrCreate(dir) {
  if (fs.existsSync(dir)) {
    const names = fs.readdirSync(dir);
    if (names.length) fail(`state directory must be empty: ${dir}`);
  } else fs.mkdirSync(dir, { recursive: true });
}
function parseChecksums(releaseDir) {
  const checksumFile = path.join(releaseDir, 'SHA256SUMS');
  if (!fs.existsSync(checksumFile)) fail(`missing SHA256SUMS: ${checksumFile}`);
  const rows = [];
  for (const raw of fs.readFileSync(checksumFile, 'utf8').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const match = raw.match(/^([0-9a-f]{64})\s+\*?(.+)$/);
    if (!match) fail(`invalid SHA256SUMS line: ${raw}`);
    const [, expected, name] = match;
    if (!safeAssetName(name)) fail(`unsafe asset name: ${name}`);
    const file = path.join(releaseDir, name);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`missing release asset: ${name}`);
    const actual = shaFile(file);
    if (actual !== expected) fail(`release asset checksum mismatch: ${name}`);
    rows.push({ name, sha256: actual, bytes: fs.statSync(file).size });
  }
  if (rows.length < 4) fail('release fixture has too few bound assets');
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return { checksumFile, checksumSha256: shaFile(checksumFile), assets: rows };
}
function commonNoMutationPolicy() {
  return {
    rehearsal_only: true,
    release_tag_published: false,
    official_release_published: false,
    live_deployment: false,
    service_restart: false,
    service_started_implicitly: false,
    wallet_state_changed: false,
    work_credit_ledger_write: false,
    buy_void_fulfillment: false,
    validator_admission: false,
    treasury_movement: false,
    authority_transfer: false,
    money_movement: false,
    guarded_lanes_activated: false,
  };
}
function makeStage(stage, sequence, packet, previousSha256, nowUtc) {
  const receipt = {
    marker: RECEIPT_MARKER,
    schema_version: 1,
    sequence,
    stage,
    repository: packet.repository,
    version: packet.version,
    official_release_tag: packet.official_release_tag,
    source_commit: packet.source_commit,
    rehearsal_namespace: packet.rehearsal_namespace,
    packet_sha256: shaObject(packet),
    previous_receipt_sha256: previousSha256,
    passed: true,
    observed_at_utc: nowUtc,
    policy: commonNoMutationPolicy(),
    evidence: {},
  };
  if (stage === 'immutable-publication-rehearsal') {
    receipt.evidence = {
      immutable_release_required: true,
      tag_replacement_allowed: false,
      asset_replacement_allowed: false,
      release_attestation_required: true,
      asset_attestations_required: true,
      asset_count: packet.assets.length,
      sha256sums_sha256: packet.sha256sums_sha256,
    };
  } else if (stage === 'candidate-promotion-rehearsal') {
    receipt.evidence = { candidate_channel_prepared: true, stable_channel_changed: false };
  } else if (stage === 'qualification-matrix-rehearsal') {
    receipt.evidence = {
      targets: QUALIFICATION_TARGETS.map((target, index) => ({
        target,
        run_id: `rehearsal-${String(index + 1).padStart(2, '0')}-${packet.source_commit.slice(0, 12)}`,
        passed: true,
      })),
      runner_ids: ['rehearsal-runner-a', 'rehearsal-runner-b'],
      complete_matrix: true,
    };
  } else if (stage === 'independent-approval-rehearsal') {
    receipt.evidence = {
      reviewer_id: 'rehearsal-independent-reviewer',
      runner_ids: ['rehearsal-runner-a', 'rehearsal-runner-b'],
      reviewer_is_runner: false,
      exact_confirmation_rehearsed: true,
    };
  } else if (stage === 'canary-rehearsal') {
    receipt.evidence = {
      canary_passed: true,
      immutable_assets_verified: true,
      qualification_receipt_bound: true,
      live_deployment: false,
    };
  } else if (stage === 'stable-promotion-rehearsal') {
    receipt.evidence = {
      stable_promotion_authorized: true,
      stable_channel_changed_only_in_rehearsal_state: true,
      release_tag_published: false,
    };
  } else if (stage === 'freeze-revoke-rehearsal') {
    receipt.evidence = {
      freeze_activated: true,
      promotion_refused_while_frozen: true,
      revocation_recorded: true,
      public_release_mutated: false,
    };
  } else if (stage === 'rollback-recovery-rehearsal') {
    receipt.evidence = {
      rollback_to_last_approved_release: true,
      rollback_to_revoked_release_refused: true,
      state_recovered_from_hash_chain: true,
    };
  }
  return receipt;
}
function validateNoMutationPolicy(policy) {
  const requiredFalse = [
    'release_tag_published', 'official_release_published', 'live_deployment', 'service_restart',
    'service_started_implicitly', 'wallet_state_changed', 'work_credit_ledger_write',
    'buy_void_fulfillment', 'validator_admission', 'treasury_movement', 'authority_transfer',
    'money_movement', 'guarded_lanes_activated',
  ];
  if (policy?.rehearsal_only !== true) fail('receipt is not rehearsal-only');
  for (const key of requiredFalse) if (policy?.[key] !== false) fail(`unsafe rehearsal policy: ${key}`);
}
function validatePacket(packet, releaseDir) {
  if (packet?.marker !== PACKET_MARKER || packet?.schema_version !== 1) fail('invalid rehearsal packet marker/schema');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(packet.repository || '')) fail('invalid repository');
  if (!isVersion(packet.version)) fail('invalid rehearsal version');
  if (!isHex(packet.source_commit, 40)) fail('invalid source commit');
  if (packet.official_release_tag !== `release-v${packet.version}`) fail('official release tag binding mismatch');
  if (packet.rehearsal_namespace !== `rehearsal/${packet.official_release_tag}/${packet.source_commit.slice(0, 12)}`) fail('rehearsal namespace binding mismatch');
  validateNoMutationPolicy(packet.policy);
  const parsed = parseChecksums(releaseDir);
  if (parsed.checksumSha256 !== packet.sha256sums_sha256) fail('packet SHA256SUMS binding mismatch');
  if (shaObject(parsed.assets) !== packet.asset_manifest_sha256) fail('packet asset manifest binding mismatch');
  if (canonical(parsed.assets) !== canonical(packet.assets)) fail('packet assets do not match release fixture');
}
function verifyState(stateDir, releaseDir) {
  const packetFile = path.join(stateDir, 'rehearsal-packet-v1.json');
  const summaryFile = path.join(stateDir, 'rehearsal-receipt-v1.json');
  if (!fs.existsSync(packetFile) || !fs.existsSync(summaryFile)) fail('rehearsal packet or summary is missing');
  const packet = readJson(packetFile);
  validatePacket(packet, releaseDir);
  const receiptDir = path.join(stateDir, 'receipts');
  const files = fs.readdirSync(receiptDir).filter((name) => name.endsWith('.json')).sort();
  if (files.length !== REQUIRED_STAGES.length) fail('incorrect rehearsal stage receipt count');
  let previous = null;
  const receiptHashes = [];
  for (let index = 0; index < REQUIRED_STAGES.length; index += 1) {
    const receipt = readJson(path.join(receiptDir, files[index]));
    if (receipt.marker !== RECEIPT_MARKER || receipt.schema_version !== 1) fail('invalid stage receipt marker/schema');
    if (receipt.sequence !== index + 1 || receipt.stage !== REQUIRED_STAGES[index]) fail('rehearsal stage ordering mismatch');
    if (receipt.packet_sha256 !== shaObject(packet) || receipt.previous_receipt_sha256 !== previous) fail('rehearsal receipt chain mismatch');
    if (receipt.repository !== packet.repository || receipt.version !== packet.version || receipt.source_commit !== packet.source_commit || receipt.official_release_tag !== packet.official_release_tag || receipt.rehearsal_namespace !== packet.rehearsal_namespace) fail('stage receipt release binding mismatch');
    if (receipt.passed !== true) fail(`rehearsal stage did not pass: ${receipt.stage}`);
    validateNoMutationPolicy(receipt.policy);
    if (receipt.stage === 'qualification-matrix-rehearsal') {
      const targets = receipt.evidence?.targets;
      if (!Array.isArray(targets) || targets.length !== QUALIFICATION_TARGETS.length) fail('qualification matrix incomplete');
      const observed = new Set(targets.map((item) => item.target));
      if (observed.size !== QUALIFICATION_TARGETS.length || QUALIFICATION_TARGETS.some((target) => !observed.has(target))) fail('qualification matrix target mismatch');
      if (targets.some((item) => item.passed !== true || !item.run_id)) fail('qualification result is not green');
    }
    if (receipt.stage === 'independent-approval-rehearsal') {
      const e = receipt.evidence || {};
      if (e.reviewer_is_runner !== false || !e.reviewer_id || !Array.isArray(e.runner_ids) || e.runner_ids.includes(e.reviewer_id)) fail('independent approval separation failed');
    }
    previous = shaObject(receipt);
    receiptHashes.push(previous);
  }
  const summary = readJson(summaryFile);
  if (summary.marker !== SUMMARY_MARKER || summary.schema_version !== 1 || summary.passed !== true) fail('invalid rehearsal summary');
  if (summary.packet_sha256 !== shaObject(packet) || summary.history_tip_sha256 !== previous) fail('rehearsal summary chain mismatch');
  if (canonical(summary.stage_receipt_sha256s) !== canonical(receiptHashes)) fail('rehearsal summary receipt list mismatch');
  validateNoMutationPolicy(summary.policy);
  return { packet, summary, receiptHashes };
}
function render(stateDir, releaseDir) {
  const { packet, summary } = verifyState(stateDir, releaseDir);
  const renderedDir = path.join(stateDir, 'rendered');
  const publicJson = {
    marker: 'VOID_PUBLIC_FIRST_OFFICIAL_RELEASE_REHEARSAL_V1',
    schema_version: 1,
    status: 'rehearsal_control_plane_green',
    repository: packet.repository,
    version: packet.version,
    official_release_tag: packet.official_release_tag,
    source_commit: packet.source_commit,
    rehearsal_namespace: packet.rehearsal_namespace,
    stage_count: summary.stage_receipt_sha256s.length,
    history_tip_sha256: summary.history_tip_sha256,
    official_release_published: false,
    release_tag_published: false,
    live_deployment: false,
    service_restart: false,
    money_movement: false,
    guarded_lanes_activated: false,
  };
  writeJson(path.join(renderedDir, 'index.json'), publicJson);
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>VOID first official release rehearsal</title></head><body>\n<h1>VOID first official release rehearsal</h1>\n<p>Status: <strong>${publicJson.status}</strong></p>\n<ul><li>Version: <code>${packet.version}</code></li><li>Tag under rehearsal: <code>${packet.official_release_tag}</code></li><li>Source commit: <code>${packet.source_commit}</code></li><li>History tip: <code>${summary.history_tip_sha256}</code></li></ul>\n<p>No release tag, official release, deployment, restart, money movement, or guarded-lane activation occurred.</p>\n</body></html>\n`;
  fs.writeFileSync(path.join(renderedDir, 'index.html'), html, { mode: 0o644 });
  return publicJson;
}
function runAll(args) {
  const repository = required(args, 'repository');
  const version = required(args, 'version');
  const sourceCommit = required(args, 'source-commit').toLowerCase();
  const releaseDir = path.resolve(required(args, 'release-dir'));
  const stateDir = path.resolve(required(args, 'state-dir'));
  const nowUtc = typeof args.now === 'string' ? args.now : '2000-01-01T00:00:00Z';
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) fail('invalid repository');
  if (!isVersion(version)) fail('invalid version');
  if (!isHex(sourceCommit, 40)) fail('invalid source commit');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(nowUtc)) fail('invalid --now timestamp');
  if (!fs.existsSync(releaseDir) || !fs.statSync(releaseDir).isDirectory()) fail('release directory is missing');
  assertEmptyOrCreate(stateDir);
  const parsed = parseChecksums(releaseDir);
  const packet = {
    marker: PACKET_MARKER,
    schema_version: 1,
    repository,
    version,
    official_release_tag: `release-v${version}`,
    source_commit: sourceCommit,
    rehearsal_namespace: `rehearsal/release-v${version}/${sourceCommit.slice(0, 12)}`,
    created_at_utc: nowUtc,
    sha256sums_sha256: parsed.checksumSha256,
    asset_manifest_sha256: shaObject(parsed.assets),
    assets: parsed.assets,
    requirements: {
      immutable_release: true,
      release_attestation: true,
      asset_attestations: true,
      candidate_promotion: true,
      full_qualification_matrix: true,
      independent_approval: true,
      canary: true,
      stable_promotion: true,
      freeze_revocation_and_rollback: true,
    },
    policy: commonNoMutationPolicy(),
  };
  writeJson(path.join(stateDir, 'rehearsal-packet-v1.json'), packet);
  const receiptDir = path.join(stateDir, 'receipts');
  fs.mkdirSync(receiptDir, { recursive: true });
  let previous = null;
  const receiptHashes = [];
  for (let index = 0; index < REQUIRED_STAGES.length; index += 1) {
    const receipt = makeStage(REQUIRED_STAGES[index], index + 1, packet, previous, nowUtc);
    const file = path.join(receiptDir, `${String(index + 1).padStart(2, '0')}-${REQUIRED_STAGES[index]}.json`);
    writeJson(file, receipt);
    previous = shaObject(receipt);
    receiptHashes.push(previous);
  }
  const summary = {
    marker: SUMMARY_MARKER,
    schema_version: 1,
    repository,
    version,
    official_release_tag: packet.official_release_tag,
    source_commit: sourceCommit,
    rehearsal_namespace: packet.rehearsal_namespace,
    packet_sha256: shaObject(packet),
    stage_receipt_sha256s: receiptHashes,
    history_tip_sha256: previous,
    passed: true,
    completed_at_utc: nowUtc,
    policy: commonNoMutationPolicy(),
  };
  writeJson(path.join(stateDir, 'rehearsal-receipt-v1.json'), summary);
  verifyState(stateDir, releaseDir);
  render(stateDir, releaseDir);
  say(`${TOOL_MARKER}_RUN_ALL_GREEN`);
  say(`packet_sha256=${shaObject(packet)}`);
  say(`history_tip_sha256=${summary.history_tip_sha256}`);
  say('release_tag_published=false');
  say('official_release_published=false');
  say('live_deployment=false');
  say('service_restart=false');
  say('money_movement=false');
  say('guarded_lanes_activated=false');
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (command === 'run-all') return runAll(args);
  if (command === 'verify') {
    const stateDir = path.resolve(required(args, 'state-dir'));
    const releaseDir = path.resolve(required(args, 'release-dir'));
    const { summary } = verifyState(stateDir, releaseDir);
    say(`${TOOL_MARKER}_VERIFY_GREEN`);
    say(`history_tip_sha256=${summary.history_tip_sha256}`);
    return;
  }
  if (command === 'render') {
    const stateDir = path.resolve(required(args, 'state-dir'));
    const releaseDir = path.resolve(required(args, 'release-dir'));
    render(stateDir, releaseDir);
    say(`${TOOL_MARKER}_RENDER_GREEN`);
    return;
  }
  fail('usage: void-first-official-release-rehearsal-v1.mjs {run-all|verify|render} ...');
}
try { main(); }
catch (error) {
  console.error(`${TOOL_MARKER}_FAIL`);
  console.error(`error=${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
