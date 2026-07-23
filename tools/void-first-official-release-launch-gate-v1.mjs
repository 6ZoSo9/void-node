#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TOOL_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_CONTROL_V1';
const PREFLIGHT_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_PREFLIGHT_V1';
const PACKET_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_PACKET_V1';
const APPROVAL_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_APPROVAL_V1';
const AUTH_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_AUTHORIZATION_V1';
const ABORT_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_ABORT_V1';
const COMMAND_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_PUBLICATION_COMMAND_V1';
const REHEARSAL_PACKET_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_PACKET_V1';
const REHEARSAL_STAGE_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_STAGE_RECEIPT_V1';
const REHEARSAL_SUMMARY_MARKER = 'VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_RECEIPT_V1';
const WORKFLOW_PATH = '.github/workflows/public-release-publication-promotion-v1.yml';
const REVIEW_MODE_INDEPENDENT = 'independent_review_v1';
const REVIEW_MODE_SOLO = 'solo_time_lock_v1';
const SOLO_MIN_WAIT_MINUTES = 720;
const FOUNDATION_KEYS = [
  'distribution',
  'update_channel',
  'publication_promotion',
  'qualification',
  'rehearsal',
  'python_bytecode_hygiene',
];
const FALSE_POLICY_KEYS = [
  'publication_executed',
  'release_tag_published',
  'official_release_published',
  'stable_channel_changed',
  'live_deployment',
  'service_restart',
  'service_started_implicitly',
  'wallet_state_changed',
  'work_credit_ledger_write',
  'buy_void_fulfillment',
  'validator_admission',
  'treasury_movement',
  'authority_transfer',
  'money_movement',
  'guarded_lanes_activated',
];

function fail(message) { throw new Error(message); }
function say(message = '') { process.stdout.write(`${message}\n`); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
function canonical(value) { return `${JSON.stringify(stable(value), null, 2)}\n`; }
function shaBytes(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function shaFile(file) { return shaBytes(fs.readFileSync(file)); }
function shaObject(value) { return shaBytes(Buffer.from(canonical(value))); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, value) {
  ensureDir(path.dirname(path.resolve(file)));
  const tmp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(tmp, canonical(value), { mode: 0o644 });
  fs.renameSync(tmp, file);
}
function copyFile(source, destination) {
  ensureDir(path.dirname(path.resolve(destination)));
  fs.copyFileSync(source, destination);
  fs.chmodSync(destination, 0o644);
}
function copyTree(source, destination) {
  ensureDir(destination);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(src, dst);
    else if (entry.isFile()) copyFile(src, dst);
    else fail(`unsupported evidence entry: ${src}`);
  }
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
function isHex(value, length) { return typeof value === 'string' && new RegExp(`^[0-9a-f]{${length}}$`).test(value); }
function isVersion(value) { return typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value); }
function validateRepository(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) fail(`invalid repository: ${value}`);
  return value;
}
function iso(value, label = 'timestamp') {
  const raw = String(value || '');
  if (!raw || Number.isNaN(Date.parse(raw))) fail(`invalid ${label}: ${raw}`);
  return new Date(raw).toISOString().replace('.000Z', 'Z');
}
function sameJson(a, b) { return canonical(a) === canonical(b); }
function validateReviewMode(value) {
  if (![REVIEW_MODE_INDEPENDENT, REVIEW_MODE_SOLO].includes(value)) fail(`invalid review mode: ${value}`);
  return value;
}
function approvalPhrase(packet) {
  const packetSha = shaObject(packet);
  if (packet.review_mode === REVIEW_MODE_SOLO) return `ACKNOWLEDGE SOLO VOID RELEASE LAUNCH ${packet.release_tag} AT ${packet.source_commit} WITHOUT INDEPENDENT REVIEW PACKET ${packetSha}`;
  return `APPROVE VOID RELEASE LAUNCH ${packet.release_tag} AT ${packet.source_commit} PACKET ${packetSha}`;
}
function sealPhrase(packet) {
  const packetSha = shaObject(packet);
  if (packet.review_mode === REVIEW_MODE_SOLO) return `SEAL SOLO VOID RELEASE LAUNCH ${packet.release_tag} AT ${packet.source_commit} UNTIL ${packet.expires_at_utc} PACKET ${packetSha}`;
  return `SEAL VOID RELEASE LAUNCH ${packet.release_tag} AT ${packet.source_commit} UNTIL ${packet.expires_at_utc} PACKET ${packetSha}`;
}
function safeAssetName(name) {
  return typeof name === 'string' && name.length > 0 && name.length < 256 && !name.includes('/') && !name.includes('\\') && name !== '.' && name !== '..';
}
function noMutationPolicy(extra = {}) {
  return {
    launch_gate_only: true,
    manual_publication_action_required: true,
    single_use_authorization: true,
    ...Object.fromEntries(FALSE_POLICY_KEYS.map((key) => [key, false])),
    ...extra,
  };
}
function validatePolicy(policy, label) {
  if (policy?.launch_gate_only !== true || policy?.manual_publication_action_required !== true || policy?.single_use_authorization !== true) fail(`${label} policy is not launch-gate-only`);
  for (const key of FALSE_POLICY_KEYS) if (policy?.[key] !== false) fail(`${label} unsafe policy: ${key}`);
}
function parseChecksums(releaseDir) {
  const checksumFile = path.join(releaseDir, 'SHA256SUMS');
  if (!fs.existsSync(checksumFile)) fail(`missing SHA256SUMS: ${checksumFile}`);
  const rows = [];
  const seen = new Set();
  for (const raw of fs.readFileSync(checksumFile, 'utf8').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const match = raw.match(/^([0-9a-f]{64})\s+\*?(.+)$/);
    if (!match) fail(`invalid SHA256SUMS line: ${raw}`);
    const [, expected, name] = match;
    if (!safeAssetName(name) || seen.has(name)) fail(`unsafe or duplicate asset name: ${name}`);
    seen.add(name);
    const file = path.join(releaseDir, name);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`missing release asset: ${name}`);
    const actual = shaFile(file);
    if (actual !== expected) fail(`release asset checksum mismatch: ${name}`);
    rows.push({ name, sha256: actual, bytes: fs.statSync(file).size });
  }
  if (rows.length < 5) fail('release asset inventory is incomplete');
  rows.sort((a, b) => a.name.localeCompare(b.name));
  const manifest = path.join(releaseDir, 'void-node-release-manifest.json');
  if (!fs.existsSync(manifest)) fail('release manifest is missing');
  return {
    assets: rows,
    asset_manifest_sha256: shaObject(rows),
    sha256sums_sha256: shaFile(checksumFile),
    release_manifest_sha256: shaFile(manifest),
    release_manifest: readJson(manifest),
  };
}
function validateBuilds(dirA, dirB, version, sourceCommit) {
  const a = parseChecksums(dirA);
  const b = parseChecksums(dirB);
  if (!sameJson(a.assets, b.assets) || a.sha256sums_sha256 !== b.sha256sums_sha256 || a.asset_manifest_sha256 !== b.asset_manifest_sha256) fail('deterministic release builds do not match');
  for (const [label, build] of [['A', a], ['B', b]]) {
    if (build.release_manifest?.version !== version) fail(`release manifest ${label} version mismatch`);
    const manifestCommit = String(build.release_manifest?.git_commit || build.release_manifest?.source_commit || '').toLowerCase();
    if (manifestCommit !== sourceCommit) fail(`release manifest ${label} source commit mismatch`);
  }
  return a;
}
function workflowRequirements(workflowFile) {
  const text = fs.readFileSync(workflowFile, 'utf8');
  const needles = [
    'workflow_dispatch:',
    'options: [verify, publish]',
    'environment: void-release-publication',
    'PUBLISH VOID RELEASE ${TAG} AT ${SOURCE_COMMIT}',
    'immutable-releases',
    'actions/attest@',
    'gh release create',
    '--verify-tag',
    'gh release verify',
    'gh release verify-asset',
    'launch_record_commit:',
    'launch_packet_sha256:',
    'launch_approval_sha256:',
    'launch_authorization_sha256:',
    'void-first-official-release-launch-gate-v1.mjs verify-record',
    'release/launch-gate/records/${LAUNCH_ID}',
    'git merge-base --is-ancestor "$SOURCE_COMMIT" "$LAUNCH_RECORD_COMMIT"',
  ];
  for (const needle of needles) if (!text.includes(needle)) fail(`publication workflow contract missing: ${needle}`);
  return { path: WORKFLOW_PATH, sha256: shaFile(workflowFile), contract_needles: needles };
}
function validatePreflight(preflight, expected, workflowFile, testMode) {
  if (preflight?.marker !== PREFLIGHT_MARKER || preflight?.schema_version !== 1) fail('invalid launch preflight marker/schema');
  for (const key of ['repository', 'version', 'release_tag', 'source_commit']) if (preflight[key] !== expected[key]) fail(`launch preflight binding mismatch: ${key}`);
  if (preflight.origin_main_commit !== expected.source_commit || preflight.package_version !== expected.version || preflight.branch !== 'main') fail('launch preflight main/version binding mismatch');
  if (preflight.working_tree_clean !== true || preflight.remote_transport !== 'ssh' || preflight.github_auth_ok !== true) fail('launch preflight repository/auth state is unsafe');
  if (preflight.remote_tag_absent !== true || preflight.github_release_absent !== true || preflight.immutable_releases_enabled !== true) fail('launch preflight publication state is unsafe');
  const env = preflight.publication_environment || {};
  const reviewMode = validateReviewMode(preflight.review_mode || env.review_mode || REVIEW_MODE_INDEPENDENT);
  if (expected.review_mode && reviewMode !== expected.review_mode) fail('launch preflight review mode mismatch');
  if (preflight.independent_review !== (reviewMode === REVIEW_MODE_INDEPENDENT) || env.review_mode !== reviewMode) fail('launch preflight review-mode flags are inconsistent');
  if (env.name !== 'void-release-publication' || env.exists !== true || env.protected !== true || env.deployment_branch_main_only !== true) fail('protected publication environment requirements are not met');
  const reviewers = Number(env.required_reviewers || 0);
  const waitMinutes = Number(env.wait_timer_minutes || 0);
  if (reviewMode === REVIEW_MODE_INDEPENDENT) {
    if (reviewers < 1 || env.prevent_self_review !== true) fail('independent-review publication environment requirements are not met');
  } else {
    if (reviewers !== 0 || env.prevent_self_review !== false || waitMinutes < SOLO_MIN_WAIT_MINUTES) fail('solo time-lock publication environment requirements are not met');
  }
  const contract = workflowRequirements(workflowFile);
  if (preflight.publication_workflow?.path !== WORKFLOW_PATH || preflight.publication_workflow?.sha256 !== contract.sha256 || preflight.publication_workflow?.publish_action !== 'publish') fail('publication workflow preflight binding mismatch');
  const confirmation = `PUBLISH VOID RELEASE ${expected.release_tag} AT ${expected.source_commit}`;
  if (preflight.publication_workflow?.confirmation !== confirmation) fail('publication workflow confirmation mismatch');
  for (const key of FOUNDATION_KEYS) if (preflight.foundation_proofs?.[key] !== true) fail(`foundation proof not green: ${key}`);
  iso(preflight.observed_at_utc, 'preflight observation timestamp');
  if (!testMode && preflight.live_github_observation !== true) fail('live GitHub observation is required outside test mode');
  if (testMode && preflight.live_github_observation !== false && preflight.live_github_observation !== true) fail('invalid test preflight observation mode');
  return contract;
}
function validateRehearsal(stateDir, releaseDir, expected) {
  const packetFile = path.join(stateDir, 'rehearsal-packet-v1.json');
  const summaryFile = path.join(stateDir, 'rehearsal-receipt-v1.json');
  if (!fs.existsSync(packetFile) || !fs.existsSync(summaryFile)) fail('rehearsal packet or receipt is missing');
  const packet = readJson(packetFile);
  const summary = readJson(summaryFile);
  if (packet.marker !== REHEARSAL_PACKET_MARKER || summary.marker !== REHEARSAL_SUMMARY_MARKER || packet.schema_version !== 1 || summary.schema_version !== 1) fail('invalid rehearsal marker/schema');
  for (const key of ['repository', 'version', 'source_commit']) if (packet[key] !== expected[key] || summary[key] !== expected[key]) fail(`rehearsal binding mismatch: ${key}`);
  if (packet.official_release_tag !== expected.release_tag || summary.official_release_tag !== expected.release_tag) fail('rehearsal release tag mismatch');
  if (summary.passed !== true || summary.packet_sha256 !== shaObject(packet) || !isHex(summary.history_tip_sha256, 64)) fail('rehearsal summary is not green');
  const packetAssets = parseChecksums(releaseDir);
  if (packet.sha256sums_sha256 !== packetAssets.sha256sums_sha256 || packet.asset_manifest_sha256 !== packetAssets.asset_manifest_sha256 || !sameJson(packet.assets, packetAssets.assets)) fail('rehearsal release assets do not match launch assets');
  const receiptDir = path.join(stateDir, 'receipts');
  const names = fs.readdirSync(receiptDir).filter((name) => name.endsWith('.json')).sort();
  if (names.length !== 8) fail('rehearsal stage receipt count mismatch');
  let previous = null;
  for (let index = 0; index < names.length; index += 1) {
    const receipt = readJson(path.join(receiptDir, names[index]));
    if (receipt.marker !== REHEARSAL_STAGE_MARKER || receipt.sequence !== index + 1 || receipt.packet_sha256 !== shaObject(packet) || receipt.previous_receipt_sha256 !== previous || receipt.passed !== true) fail('rehearsal receipt chain mismatch');
    previous = shaObject(receipt);
  }
  if (previous !== summary.history_tip_sha256) fail('rehearsal history tip mismatch');
  for (const key of ['release_tag_published', 'official_release_published', 'live_deployment', 'service_restart', 'money_movement', 'guarded_lanes_activated']) if (summary.policy?.[key] !== false) fail(`unsafe rehearsal summary policy: ${key}`);
  return { packet, summary, packet_sha256: shaObject(packet), receipt_sha256: shaObject(summary) };
}
function validatePacket(packet) {
  if (packet?.marker !== PACKET_MARKER || packet?.schema_version !== 1) fail('invalid launch packet marker/schema');
  validateRepository(packet.repository);
  if (!isVersion(packet.version) || packet.release_tag !== `release-v${packet.version}` || !isHex(packet.source_commit, 40)) fail('invalid launch packet release identity');
  if (!/^launch-release-v[0-9A-Za-z.+-]+-[0-9a-f]{16}$/.test(packet.launch_id || '')) fail('invalid launch id');
  const reviewMode = validateReviewMode(packet.review_mode);
  const expectedStatus = reviewMode === REVIEW_MODE_SOLO ? 'awaiting_solo_operator_confirmation' : 'awaiting_independent_approval';
  if (!packet.preparer_id || packet.status !== expectedStatus) fail('invalid launch packet preparation state');
  if (packet.independent_review !== (reviewMode === REVIEW_MODE_INDEPENDENT) || packet.solo_operator !== (reviewMode === REVIEW_MODE_SOLO)) fail('launch packet review-mode flags are inconsistent');
  if (packet.requirements?.independent_approval_required !== (reviewMode === REVIEW_MODE_INDEPENDENT) || packet.requirements?.solo_operator_time_lock_required !== (reviewMode === REVIEW_MODE_SOLO) || packet.requirements?.no_independent_review_claimed !== (reviewMode === REVIEW_MODE_SOLO)) fail('launch packet review-mode requirements are inconsistent');
  if (reviewMode === REVIEW_MODE_SOLO && Number(packet.requirements?.minimum_environment_wait_timer_minutes || 0) < SOLO_MIN_WAIT_MINUTES) fail('launch packet solo wait-timer requirement is too weak');
  if (!isHex(packet.preflight_sha256, 64) || !isHex(packet.release?.sha256sums_sha256, 64) || !isHex(packet.release?.asset_manifest_sha256, 64) || !Array.isArray(packet.release?.assets) || packet.release.assets.length < 5) fail('invalid launch packet release binding');
  if (packet.release?.deterministic_build_match !== true || !isHex(packet.rehearsal?.receipt_sha256, 64) || packet.rehearsal?.passed !== true) fail('launch packet proof bindings are incomplete');
  if (packet.exact_publication?.workflow_file !== WORKFLOW_PATH || packet.exact_publication?.action !== 'publish' || packet.exact_publication?.version !== packet.version || packet.exact_publication?.source_commit !== packet.source_commit || packet.exact_publication?.confirmation !== `PUBLISH VOID RELEASE ${packet.release_tag} AT ${packet.source_commit}` || packet.exact_publication?.launch_record_required !== true) fail('launch packet publication command binding mismatch');
  const created = Date.parse(iso(packet.created_at_utc));
  const expires = Date.parse(iso(packet.expires_at_utc));
  const lifetime = expires - created;
  if (!(lifetime > 0) || lifetime > 24 * 60 * 60 * 1000) fail('launch packet expiry must be after creation and at most 24 hours');
  if (reviewMode === REVIEW_MODE_SOLO && lifetime < 14 * 60 * 60 * 1000) fail('solo time-lock launch packet must remain valid for at least 14 hours');
  validatePolicy(packet.policy, 'launch packet');
  return packet;
}
function validateApproval(approval, packet) {
  if (approval?.marker !== APPROVAL_MARKER || approval?.schema_version !== 1) fail('invalid launch approval marker/schema');
  const packetSha = shaObject(packet);
  if (approval.launch_id !== packet.launch_id || approval.packet_sha256 !== packetSha || approval.repository !== packet.repository || approval.release_tag !== packet.release_tag || approval.source_commit !== packet.source_commit || approval.review_mode !== packet.review_mode) fail('launch approval binding mismatch');
  if (approval.approved !== true || !approval.reviewer_id) fail('launch approval is incomplete');
  const approvedAt = Date.parse(iso(approval.approved_at_utc, 'approval timestamp'));
  if (approvedAt < Date.parse(packet.created_at_utc) || approvedAt > Date.parse(packet.expires_at_utc)) fail('launch approval timestamp is outside the packet lifetime');
  if (packet.review_mode === REVIEW_MODE_INDEPENDENT) {
    if (approval.reviewer_id === packet.preparer_id || approval.independent_review !== true || approval.solo_operator !== false) fail('launch approval is not independent');
  } else {
    if (approval.reviewer_id !== packet.preparer_id || approval.independent_review !== false || approval.solo_operator !== true || approval.risk_acknowledgement !== 'NO_INDEPENDENT_REVIEW') fail('solo launch approval identity or risk acknowledgement mismatch');
  }
  const phrase = approvalPhrase(packet);
  if (approval.confirmation !== phrase) fail('launch approval confirmation mismatch');
  validatePolicy(approval.policy, 'launch approval');
  return approval;
}
function validateAuthorization(auth, packet, approval) {
  if (auth?.marker !== AUTH_MARKER || auth?.schema_version !== 1) fail('invalid launch authorization marker/schema');
  const packetSha = shaObject(packet);
  const approvalSha = shaObject(approval);
  if (auth.launch_id !== packet.launch_id || auth.packet_sha256 !== packetSha || auth.approval_sha256 !== approvalSha || auth.repository !== packet.repository || auth.release_tag !== packet.release_tag || auth.source_commit !== packet.source_commit || auth.review_mode !== packet.review_mode) fail('launch authorization binding mismatch');
  if (auth.authorized !== true || auth.single_use !== true || auth.authorizer_id !== approval.reviewer_id || auth.expires_at_utc !== packet.expires_at_utc) fail('launch authorization identity/expiry mismatch');
  const authorizedAt = Date.parse(iso(auth.authorized_at_utc, 'authorization timestamp'));
  if (authorizedAt < Date.parse(approval.approved_at_utc) || authorizedAt > Date.parse(packet.expires_at_utc)) fail('launch authorization timestamp is outside the approved packet lifetime');
  if (packet.review_mode === REVIEW_MODE_INDEPENDENT) {
    if (auth.authorizer_id === packet.preparer_id || auth.independent_review !== true || auth.solo_operator !== false) fail('independent launch authorization identity mismatch');
  } else {
    if (auth.authorizer_id !== packet.preparer_id || auth.independent_review !== false || auth.solo_operator !== true || auth.risk_acknowledgement !== 'NO_INDEPENDENT_REVIEW') fail('solo launch authorization identity or risk acknowledgement mismatch');
  }
  const phrase = sealPhrase(packet);
  if (auth.confirmation !== phrase) fail('launch authorization confirmation mismatch');
  validatePolicy(auth.policy, 'launch authorization');
  return auth;
}
function validateAbort(abort, packet, approval, auth) {
  if (abort?.marker !== ABORT_MARKER || abort?.schema_version !== 1) fail('invalid launch abort marker/schema');
  if (abort.launch_id !== packet.launch_id || abort.packet_sha256 !== shaObject(packet) || abort.approval_sha256 !== shaObject(approval) || abort.authorization_sha256 !== shaObject(auth) || abort.aborted !== true) fail('launch abort binding mismatch');
  if (![packet.preparer_id, approval.reviewer_id].includes(abort.actor_id) || !abort.reason) fail('launch abort actor/reason invalid');
  const phrase = `ABORT VOID RELEASE LAUNCH ${packet.release_tag} AT ${packet.source_commit} PACKET ${shaObject(packet)}`;
  if (abort.confirmation !== phrase) fail('launch abort confirmation mismatch');
  validatePolicy(abort.policy, 'launch abort');
  return abort;
}
function shellQuote(value) { return `'${String(value).replaceAll("'", `'"'"'`)}'`; }
function publicationCommand(packet, approval, auth, recordCommit = 'REPLACE_WITH_EXACT_LAUNCH_RECORD_COMMIT') {
  const argv = [
    'gh', 'workflow', 'run', 'public-release-publication-promotion-v1.yml',
    '--repo', packet.repository,
    '--ref', 'main',
    '-f', 'action=publish',
    '-f', `version=${packet.version}`,
    '-f', `source_commit=${packet.source_commit}`,
    '-f', `confirmation=${packet.exact_publication.confirmation}`,
    '-f', `launch_id=${packet.launch_id}`,
    '-f', `launch_record_commit=${recordCommit}`,
    '-f', `launch_packet_sha256=${shaObject(packet)}`,
    '-f', `launch_approval_sha256=${shaObject(approval)}`,
    '-f', `launch_authorization_sha256=${shaObject(auth)}`,
  ];
  return {
    marker: COMMAND_MARKER,
    schema_version: 1,
    launch_id: packet.launch_id,
    launch_record_commit: recordCommit,
    launch_record_commit_finalized: isHex(recordCommit, 40),
    packet_sha256: shaObject(packet),
    approval_sha256: shaObject(approval),
    authorization_sha256: shaObject(auth),
    repository: packet.repository,
    release_tag: packet.release_tag,
    source_commit: packet.source_commit,
    review_mode: packet.review_mode,
    independent_review: packet.review_mode === REVIEW_MODE_INDEPENDENT,
    workflow_file: WORKFLOW_PATH,
    executable_by_gate: false,
    operator_must_reverify_gate_immediately_before_manual_execution: true,
    command_argv: argv,
    shell_display: argv.map(shellQuote).join(' '),
    policy: noMutationPolicy(),
  };
}
function prepare(args) {
  const repository = validateRepository(required(args, 'repository'));
  const version = required(args, 'version');
  if (!isVersion(version)) fail('invalid semantic version');
  if (version.includes('-') && args['allow-prerelease'] !== true) fail('prerelease version requires --allow-prerelease');
  const sourceCommit = required(args, 'source-commit').toLowerCase();
  if (!isHex(sourceCommit, 40)) fail('invalid source commit');
  const releaseTag = `release-v${version}`;
  const createdAt = iso(required(args, 'now'), 'creation timestamp');
  const expiresAt = iso(required(args, 'expires-at'), 'expiry timestamp');
  const preparerId = required(args, 'preparer-id');
  if (!/^[A-Za-z0-9_.:@+-]{2,128}$/.test(preparerId)) fail('invalid preparer id');
  const reviewMode = validateReviewMode(typeof args['review-mode'] === 'string' ? args['review-mode'] : REVIEW_MODE_INDEPENDENT);
  const dirA = path.resolve(required(args, 'release-dir-a'));
  const dirB = path.resolve(required(args, 'release-dir-b'));
  const preflightFile = path.resolve(required(args, 'preflight'));
  const rehearsalState = path.resolve(required(args, 'rehearsal-state-dir'));
  const workflowFile = path.resolve(required(args, 'workflow-file'));
  const stateDir = path.resolve(required(args, 'state-dir'));
  if (fs.existsSync(stateDir) && fs.readdirSync(stateDir).length) fail(`state directory must be empty: ${stateDir}`);
  ensureDir(stateDir);
  const expected = { repository, version, release_tag: releaseTag, source_commit: sourceCommit, review_mode: reviewMode };
  const build = validateBuilds(dirA, dirB, version, sourceCommit);
  const preflight = readJson(preflightFile);
  const workflow = validatePreflight(preflight, expected, workflowFile, args['test-mode'] === true);
  const rehearsal = validateRehearsal(rehearsalState, dirA, expected);
  const core = {
    repository,
    version,
    release_tag: releaseTag,
    source_commit: sourceCommit,
    created_at_utc: createdAt,
    expires_at_utc: expiresAt,
    preparer_id: preparerId,
    review_mode: reviewMode,
    independent_review: reviewMode === REVIEW_MODE_INDEPENDENT,
    solo_operator: reviewMode === REVIEW_MODE_SOLO,
    preflight_sha256: shaObject(preflight),
    release: {
      deterministic_build_match: true,
      sha256sums_sha256: build.sha256sums_sha256,
      asset_manifest_sha256: build.asset_manifest_sha256,
      release_manifest_sha256: build.release_manifest_sha256,
      assets: build.assets,
    },
    rehearsal: {
      packet_sha256: rehearsal.packet_sha256,
      receipt_sha256: rehearsal.receipt_sha256,
      history_tip_sha256: rehearsal.summary.history_tip_sha256,
      passed: true,
    },
    publication_workflow: workflow,
    exact_publication: {
      workflow_file: WORKFLOW_PATH,
      action: 'publish',
      version,
      source_commit: sourceCommit,
      confirmation: `PUBLISH VOID RELEASE ${releaseTag} AT ${sourceCommit}`,
      launch_record_required: true,
      launch_record_repository_path_prefix: 'release/launch-gate/records',
    },
    requirements: {
      exact_main_commit_frozen: true,
      deterministic_assets_built_twice: true,
      immutable_release_enabled: true,
      protected_publication_environment: true,
      release_and_tag_absent: true,
      all_foundation_proofs_green: true,
      complete_no_publish_rehearsal_green: true,
      independent_approval_required: reviewMode === REVIEW_MODE_INDEPENDENT,
      solo_operator_time_lock_required: reviewMode === REVIEW_MODE_SOLO,
      minimum_environment_wait_timer_minutes: reviewMode === REVIEW_MODE_SOLO ? SOLO_MIN_WAIT_MINUTES : 0,
      no_independent_review_claimed: reviewMode === REVIEW_MODE_SOLO,
      expiring_single_use_authorization_required: true,
      manual_publication_action_required: true,
      post_publication_canary_and_qualification_still_required_for_stable: true,
    },
    status: reviewMode === REVIEW_MODE_SOLO ? 'awaiting_solo_operator_confirmation' : 'awaiting_independent_approval',
    policy: noMutationPolicy(),
  };
  const launchDigest = shaObject(core).slice(0, 16);
  const packet = { marker: PACKET_MARKER, schema_version: 1, launch_id: `launch-${releaseTag}-${launchDigest}`, ...core };
  validatePacket(packet);
  writeJson(path.join(stateDir, 'launch-preflight-v1.json'), preflight);
  writeJson(path.join(stateDir, 'launch-packet-v1.json'), packet);
  say(`${TOOL_MARKER}_PREPARE_GREEN`);
  say(`launch_id=${packet.launch_id}`);
  say(`packet_sha256=${shaObject(packet)}`);
  say(`review_mode=${packet.review_mode}`);
  say(`independent_review=${packet.independent_review}`);
  say(`approval_confirmation=${approvalPhrase(packet)}`);
  say('publication_executed=false');
}
function approve(args) {
  const packet = validatePacket(readJson(path.resolve(required(args, 'packet'))));
  const reviewerId = required(args, 'reviewer-id');
  const confirmation = required(args, 'confirmation');
  const approvedAt = iso(required(args, 'now'), 'approval timestamp');
  const approval = {
    marker: APPROVAL_MARKER,
    schema_version: 1,
    launch_id: packet.launch_id,
    packet_sha256: shaObject(packet),
    repository: packet.repository,
    release_tag: packet.release_tag,
    source_commit: packet.source_commit,
    preparer_id: packet.preparer_id,
    reviewer_id: reviewerId,
    review_mode: packet.review_mode,
    independent_review: packet.review_mode === REVIEW_MODE_INDEPENDENT,
    solo_operator: packet.review_mode === REVIEW_MODE_SOLO,
    risk_acknowledgement: packet.review_mode === REVIEW_MODE_SOLO ? 'NO_INDEPENDENT_REVIEW' : 'INDEPENDENT_REVIEW',
    approved: true,
    confirmation,
    approved_at_utc: approvedAt,
    policy: noMutationPolicy(),
  };
  validateApproval(approval, packet);
  writeJson(path.resolve(required(args, 'out')), approval);
  say(`${TOOL_MARKER}_APPROVE_GREEN`);
  say(`approval_sha256=${shaObject(approval)}`);
  say(`review_mode=${packet.review_mode}`);
  say(`seal_confirmation=${sealPhrase(packet)}`);
}
function seal(args) {
  const packet = validatePacket(readJson(path.resolve(required(args, 'packet'))));
  const approval = validateApproval(readJson(path.resolve(required(args, 'approval'))), packet);
  const auth = {
    marker: AUTH_MARKER,
    schema_version: 1,
    launch_id: packet.launch_id,
    packet_sha256: shaObject(packet),
    approval_sha256: shaObject(approval),
    repository: packet.repository,
    release_tag: packet.release_tag,
    source_commit: packet.source_commit,
    authorizer_id: required(args, 'authorizer-id'),
    review_mode: packet.review_mode,
    independent_review: packet.review_mode === REVIEW_MODE_INDEPENDENT,
    solo_operator: packet.review_mode === REVIEW_MODE_SOLO,
    risk_acknowledgement: packet.review_mode === REVIEW_MODE_SOLO ? 'NO_INDEPENDENT_REVIEW' : 'INDEPENDENT_REVIEW',
    authorized: true,
    single_use: true,
    confirmation: required(args, 'confirmation'),
    authorized_at_utc: iso(required(args, 'now'), 'authorization timestamp'),
    expires_at_utc: packet.expires_at_utc,
    policy: noMutationPolicy(),
  };
  validateAuthorization(auth, packet, approval);
  writeJson(path.resolve(required(args, 'out')), auth);
  say(`${TOOL_MARKER}_SEAL_GREEN`);
  say(`authorization_sha256=${shaObject(auth)}`);
  say('publication_executed=false');
}
function verify(args) {
  const packetFile = path.resolve(required(args, 'packet'));
  const approvalFile = path.resolve(required(args, 'approval'));
  const authFile = path.resolve(required(args, 'authorization'));
  const packet = validatePacket(readJson(packetFile));
  const approval = validateApproval(readJson(approvalFile), packet);
  const auth = validateAuthorization(readJson(authFile), packet, approval);
  const preflight = readJson(path.resolve(required(args, 'preflight')));
  const workflowFile = path.resolve(required(args, 'workflow-file'));
  validatePreflight(preflight, packet, workflowFile, args['test-mode'] === true);
  if (shaObject(preflight) !== packet.preflight_sha256) fail('preflight changed after launch packet preparation');
  const build = validateBuilds(path.resolve(required(args, 'release-dir-a')), path.resolve(required(args, 'release-dir-b')), packet.version, packet.source_commit);
  if (build.sha256sums_sha256 !== packet.release.sha256sums_sha256 || build.asset_manifest_sha256 !== packet.release.asset_manifest_sha256 || !sameJson(build.assets, packet.release.assets)) fail('release assets changed after launch packet preparation');
  const rehearsal = validateRehearsal(path.resolve(required(args, 'rehearsal-state-dir')), path.resolve(required(args, 'release-dir-a')), packet);
  if (rehearsal.receipt_sha256 !== packet.rehearsal.receipt_sha256 || rehearsal.summary.history_tip_sha256 !== packet.rehearsal.history_tip_sha256) fail('rehearsal changed after launch packet preparation');
  const now = Date.parse(iso(required(args, 'now'), 'verification timestamp'));
  if (now > Date.parse(packet.expires_at_utc)) fail('launch authorization expired');
  if (typeof args.abort === 'string' && fs.existsSync(path.resolve(args.abort))) {
    validateAbort(readJson(path.resolve(args.abort)), packet, approval, auth);
    fail('launch authorization was aborted');
  }
  say(`${TOOL_MARKER}_VERIFY_GREEN`);
  say(`launch_id=${packet.launch_id}`);
  say(`packet_sha256=${shaObject(packet)}`);
  say(`approval_sha256=${shaObject(approval)}`);
  say(`authorization_sha256=${shaObject(auth)}`);
  say(`expires_at_utc=${packet.expires_at_utc}`);
  say('publication_executed=false');
  return { packet, approval, auth };
}
function render(args) {
  const verified = verify(args);
  const outDir = path.resolve(required(args, 'out-dir'));
  ensureDir(outDir);
  const command = publicationCommand(verified.packet, verified.approval, verified.auth);
  const recordDir = path.join(outDir, 'launch-record', verified.packet.launch_id);
  ensureDir(recordDir);
  copyFile(path.resolve(required(args, 'preflight')), path.join(recordDir, 'launch-preflight-v1.json'));
  copyFile(path.resolve(required(args, 'packet')), path.join(recordDir, 'launch-packet-v1.json'));
  copyFile(path.resolve(required(args, 'approval')), path.join(recordDir, 'launch-approval-v1.json'));
  copyFile(path.resolve(required(args, 'authorization')), path.join(recordDir, 'launch-authorization-v1.json'));
  copyTree(path.resolve(required(args, 'rehearsal-state-dir')), path.join(recordDir, 'rehearsal'));
  const recordFiles = [];
  function inventory(root, current = root) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) inventory(root, full);
      else if (entry.isFile()) {
        const rel = path.relative(root, full).split(path.sep).join('/');
        if (rel !== 'launch-record-manifest-v1.json') recordFiles.push({ path: rel, sha256: shaFile(full), bytes: fs.statSync(full).size });
      }
    }
  }
  inventory(recordDir);
  recordFiles.sort((a, b) => a.path.localeCompare(b.path));
  const recordManifest = {
    marker: 'VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_RECORD_V1', schema_version: 1,
    launch_id: verified.packet.launch_id, repository: verified.packet.repository,
    release_tag: verified.packet.release_tag, source_commit: verified.packet.source_commit,
    review_mode: verified.packet.review_mode,
    independent_review: verified.packet.review_mode === REVIEW_MODE_INDEPENDENT,
    packet_sha256: shaObject(verified.packet), approval_sha256: shaObject(verified.approval),
    authorization_sha256: shaObject(verified.auth),
    expires_at_utc: verified.packet.expires_at_utc,
    publication_workflow_sha256: verified.packet.publication_workflow.sha256,
    source_release_sha256sums_sha256: verified.packet.release.sha256sums_sha256,
    rehearsal_receipt_sha256: verified.packet.rehearsal.receipt_sha256,
    files: recordFiles,
    publication_executed: false, release_tag_published: false, official_release_published: false,
  };
  writeJson(path.join(recordDir, 'launch-record-manifest-v1.json'), recordManifest);
  const status = {
    marker: 'VOID_PUBLIC_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_V1',
    schema_version: 1,
    status: 'sealed_awaiting_manual_publication_action',
    launch_id: verified.packet.launch_id,
    repository: verified.packet.repository,
    version: verified.packet.version,
    release_tag: verified.packet.release_tag,
    source_commit: verified.packet.source_commit,
    review_mode: verified.packet.review_mode,
    independent_review: verified.packet.review_mode === REVIEW_MODE_INDEPENDENT,
    packet_sha256: shaObject(verified.packet),
    approval_sha256: shaObject(verified.approval),
    authorization_sha256: shaObject(verified.auth),
    expires_at_utc: verified.packet.expires_at_utc,
    exact_publication_command_sha256: shaObject(command),
    launch_record_directory: `launch-record/${verified.packet.launch_id}`,
    launch_record_commit_required_before_command_finalization: true,
    post_publication_canary_required: true,
    post_publication_qualification_required: true,
    stable_promotion_performed: false,
    publication_executed: false,
    release_tag_published: false,
    official_release_published: false,
    live_deployment: false,
    service_restart: false,
    money_movement: false,
    guarded_lanes_activated: false,
  };
  writeJson(path.join(outDir, 'publication-command-v1.json'), command);
  writeJson(path.join(outDir, 'launch-gate-status-v1.json'), status);
  fs.writeFileSync(path.join(outDir, 'publication-command-v1.txt'), [
    'VOID FIRST OFFICIAL RELEASE — MANUAL PUBLICATION COMMAND',
    '',
    'This file is inert text. The launch gate never executes it.',
    'Immediately before any manual use, rerun live verification and confirm main, tag absence, release absence, immutable releases, environment protection, packet, approval, authorization, and expiry.',
    '',
    command.shell_display,
    '',
  ].join('\n'), { mode: 0o644 });
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>VOID first official release launch gate</title></head><body>\n<h1>VOID first official release launch gate</h1>\n<p>Status: <strong>${status.status}</strong></p>\n<ul><li>Version: <code>${status.version}</code></li><li>Release tag: <code>${status.release_tag}</code></li><li>Source commit: <code>${status.source_commit}</code></li><li>Expires: <code>${status.expires_at_utc}</code></li></ul>\n<p>The exact publication command is prepared but has not been executed. Post-publication canary and qualification remain mandatory before stable promotion.</p>\n</body></html>\n`;
  fs.writeFileSync(path.join(outDir, 'launch-gate-status-v1.html'), html, { mode: 0o644 });
  say(`${TOOL_MARKER}_RENDER_GREEN`);
  say(`publication_command_sha256=${shaObject(command)}`);
  say(`launch_record_dir=${recordDir}`);
  say('launch_record_commit_finalized=false');
  say('executable_by_gate=false');
  say('publication_executed=false');
}
function abortLaunch(args) {
  const packet = validatePacket(readJson(path.resolve(required(args, 'packet'))));
  const approval = validateApproval(readJson(path.resolve(required(args, 'approval'))), packet);
  const auth = validateAuthorization(readJson(path.resolve(required(args, 'authorization'))), packet, approval);
  const abort = {
    marker: ABORT_MARKER,
    schema_version: 1,
    launch_id: packet.launch_id,
    packet_sha256: shaObject(packet),
    approval_sha256: shaObject(approval),
    authorization_sha256: shaObject(auth),
    actor_id: required(args, 'actor-id'),
    aborted: true,
    reason: required(args, 'reason'),
    confirmation: required(args, 'confirmation'),
    aborted_at_utc: iso(required(args, 'now'), 'abort timestamp'),
    policy: noMutationPolicy(),
  };
  validateAbort(abort, packet, approval, auth);
  writeJson(path.resolve(required(args, 'out')), abort);
  say(`${TOOL_MARKER}_ABORT_GREEN`);
  say(`abort_sha256=${shaObject(abort)}`);
  say('publication_executed=false');
}

function validateRecordManifest(recordDir, packet, approval, auth) {
  const file = path.join(recordDir, 'launch-record-manifest-v1.json');
  if (!fs.existsSync(file)) fail('launch record manifest is missing');
  const manifest = readJson(file);
  if (manifest.marker !== 'VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_RECORD_V1' || manifest.schema_version !== 1 || manifest.launch_id !== packet.launch_id || manifest.repository !== packet.repository || manifest.release_tag !== packet.release_tag || manifest.source_commit !== packet.source_commit || manifest.review_mode !== packet.review_mode || manifest.independent_review !== (packet.review_mode === REVIEW_MODE_INDEPENDENT) || manifest.packet_sha256 !== shaObject(packet) || manifest.approval_sha256 !== shaObject(approval) || manifest.authorization_sha256 !== shaObject(auth)) fail('launch record manifest binding mismatch');
  if (manifest.expires_at_utc !== packet.expires_at_utc || manifest.publication_workflow_sha256 !== packet.publication_workflow.sha256 || manifest.source_release_sha256sums_sha256 !== packet.release.sha256sums_sha256 || manifest.rehearsal_receipt_sha256 !== packet.rehearsal.receipt_sha256) fail('launch record proof digest binding mismatch');
  if (!Array.isArray(manifest.files) || manifest.files.length < 12) fail('launch record inventory is incomplete');
  const requiredFiles = new Set(['launch-preflight-v1.json', 'launch-packet-v1.json', 'launch-approval-v1.json', 'launch-authorization-v1.json', 'rehearsal/rehearsal-packet-v1.json', 'rehearsal/rehearsal-receipt-v1.json']);
  const seen = new Set();
  const root = path.resolve(recordDir);
  for (const item of manifest.files) {
    if (typeof item.path !== 'string' || item.path.startsWith('/') || item.path.includes('..') || item.path.includes('\\') || seen.has(item.path) || !isHex(item.sha256, 64) || !Number.isSafeInteger(item.bytes) || item.bytes < 0) fail('unsafe launch record inventory');
    seen.add(item.path);
    requiredFiles.delete(item.path);
    const target = path.resolve(recordDir, item.path);
    if (!(target === root || target.startsWith(`${root}${path.sep}`))) fail(`launch record path escapes root: ${item.path}`);
    if (!fs.existsSync(target)) fail(`launch record file missing: ${item.path}`);
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink() || shaFile(target) !== item.sha256 || stat.size !== item.bytes) fail(`launch record file mismatch: ${item.path}`);
  }
  if (requiredFiles.size) fail(`launch record required files missing: ${[...requiredFiles].join(',')}`);
  if (manifest.publication_executed !== false || manifest.release_tag_published !== false || manifest.official_release_published !== false) fail('launch record manifest claims a publication mutation');
  return manifest;
}
function verifyRecord(args) {
  const recordDir = path.resolve(required(args, 'record-dir'));
  const mapped = {
    ...args,
    packet: path.join(recordDir, 'launch-packet-v1.json'),
    approval: path.join(recordDir, 'launch-approval-v1.json'),
    authorization: path.join(recordDir, 'launch-authorization-v1.json'),
    preflight: path.join(recordDir, 'launch-preflight-v1.json'),
    'rehearsal-state-dir': path.join(recordDir, 'rehearsal'),
  };
  const abortFile = path.join(recordDir, 'launch-abort-v1.json');
  if (fs.existsSync(abortFile)) mapped.abort = abortFile;
  const verified = verify(mapped);
  validateRecordManifest(recordDir, verified.packet, verified.approval, verified.auth);
  say(`${TOOL_MARKER}_VERIFY_RECORD_GREEN`);
  say(`launch_id=${verified.packet.launch_id}`);
  say(`record_manifest_sha256=${shaFile(path.join(recordDir, 'launch-record-manifest-v1.json'))}`);
  say('publication_executed=false');
  return verified;
}
function finalizeCommand(args) {
  const recordDir = path.resolve(required(args, 'record-dir'));
  const recordCommit = required(args, 'launch-record-commit').toLowerCase();
  if (!isHex(recordCommit, 40)) fail('invalid launch record commit');
  const mapped = {
    ...args,
    packet: path.join(recordDir, 'launch-packet-v1.json'),
    approval: path.join(recordDir, 'launch-approval-v1.json'),
    authorization: path.join(recordDir, 'launch-authorization-v1.json'),
    preflight: path.join(recordDir, 'launch-preflight-v1.json'),
    'rehearsal-state-dir': path.join(recordDir, 'rehearsal'),
  };
  const verified = verify(mapped);
  validateRecordManifest(recordDir, verified.packet, verified.approval, verified.auth);
  const command = publicationCommand(verified.packet, verified.approval, verified.auth, recordCommit);
  writeJson(path.resolve(required(args, 'out')), command);
  say(`${TOOL_MARKER}_FINALIZE_COMMAND_GREEN`);
  say(`launch_record_commit=${recordCommit}`);
  say(`publication_command_sha256=${shaObject(command)}`);
  say('publication_executed=false');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (command === 'prepare') return prepare(args);
  if (command === 'approve') return approve(args);
  if (command === 'seal') return seal(args);
  if (command === 'verify') return verify(args);
  if (command === 'render') return render(args);
  if (command === 'verify-record') return verifyRecord(args);
  if (command === 'finalize-command') return finalizeCommand(args);
  if (command === 'abort') return abortLaunch(args);
  fail('usage: void-first-official-release-launch-gate-v1.mjs {prepare|approve|seal|verify|render|verify-record|finalize-command|abort} ...');
}
try { main(); }
catch (error) {
  console.error(`${TOOL_MARKER}_FAIL`);
  console.error(`error=${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
