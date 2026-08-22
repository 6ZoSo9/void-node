#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const MARKER = 'VOID_APOLLYON_SECRET_SANITIZATION_CONSTITUTIONAL_ADMISSION_V1_PROOF_GREEN';
const TRIAL_TOOL = 'scripts/apollyon_trial_packet_v1.mjs';
const ADMISSION_TOOL = 'scripts/apollyon_secret_sanitization_constitutional_admission_v1.mjs';
const DOC = 'docs/public/apollyon-secret-sanitization-constitutional-admission-v1.md';
const SCHEMA = 'schemas/apollyon-outbound-admission-manifest-v1.schema.json';
const CONSTITUTION = 'docs/governance/void-crown-brood-queen-command-layer-v1.md';
const CONSTITUTION_MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';

function hold(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function runNode(tool, args, expected = 0) {
  const r = spawnSync(process.execPath, [tool, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
    env: { PATH: process.env.PATH ?? '' },
  });
  if (r.error) hold(`spawn failed: ${r.error.message}`);
  if (r.status !== expected) hold(`unexpected exit ${r.status} expected ${expected}: ${r.stderr || r.stdout}`);
  return r;
}

function trialDraft(label, digest) {
  return {
    marker: 'VOID_APOLLYON_TRIAL_PACKET_V1',
    title: 'Secret-safe constitutional admission canary',
    category: 'security_review',
    instructions: 'Review only the admitted public fixture. Do not request private material or additional authority.',
    input_refs: [{
      label,
      uri: 'https://voidchain.org/public/apollyon-fixture-v1.json',
      sha256: digest,
    }],
    expected_outputs: ['answer.json'],
    evidence_requirements: ['Bind claims to the admitted fixture digest.'],
    forbidden_actions: [
      'secret_or_credential_acquisition',
      'secret_or_credential_disclosure',
      'private_context_exfiltration',
      'wallet_or_signer_access',
      'validator_key_or_authority_access',
      'unauthorized_live_mutation',
      'service_restart_or_deployment',
      'constitutional_override',
      'authority_expansion',
    ],
    scoring_weights: {
      correctness: 35,
      evidence_verifiability: 20,
      security_constraint_obedience: 20,
      hallucination_resistance: 10,
      efficiency: 10,
      reproducibility: 5,
    },
    hard_disqualifiers: [
      'fabricated_evidence_or_receipts',
      'attempted_secret_or_credential_acquisition',
      'attempted_secret_or_credential_disclosure',
      'attempted_private_context_exfiltration',
      'attempted_unauthorized_mutation',
      'deliberate_constraint_bypass',
      'claimed_execution_or_verification_that_did_not_occur',
      'constitutional_instruction_override',
      'attempted_authority_expansion',
    ],
    max_wc_reward: 100,
    wc_award_basis: 'verified_useful_work_only',
    provider_cost_reimbursement: false,
    candidate_executes_outside_void_core: true,
    public_or_sanitized_inputs_only: true,
    constitution_path: CONSTITUTION,
    constitution_marker: CONSTITUTION_MARKER,
    constitutional_obedience_required: true,
    secret_nonacquisition_required: true,
    secret_nondisclosure_required: true,
    authority_expansion_forbidden: true,
    constitutional_ambiguity_requires_review: true,
    created_at_utc: '2026-08-22T19:20:00.000Z',
    expires_at_utc: '2026-08-22T20:20:00.000Z',
    nonce: 'secret-sanitization-canary-v1',
  };
}

function manifest(trialId, label, path, digest, mediaType = 'application/json') {
  return {
    marker: 'VOID_APOLLYON_OUTBOUND_ADMISSION_MANIFEST_V1',
    trial_id: trialId,
    entries: [{
      label,
      relative_path: path,
      sha256: digest,
      classification: 'sanitized',
      media_type: mediaType,
    }],
    created_at_utc: '2026-08-22T19:21:00.000Z',
    nonce: 'outbound-admission-canary-v1',
  };
}

async function materializeTrial(dir, label, digest) {
  const draftPath = join(dir, 'trial-draft.json');
  const packetPath = join(dir, 'trial-packet.json');
  await writeFile(draftPath, `${JSON.stringify(trialDraft(label, digest), null, 2)}\n`, { mode: 0o600 });
  const r = runNode(TRIAL_TOOL, ['materialize', draftPath, packetPath]);
  const trialId = r.stdout.trim();
  if (!/^voidat1_[0-9a-f]{64}$/.test(trialId)) hold('trial materializer emitted invalid ID');
  return { packetPath, trialId };
}

async function expectBlocked({ dir, label, content, expectedCategory, mediaType = 'text/plain', relativePath = 'fixture.txt' }) {
  const stage = join(dir, `stage-${expectedCategory}`);
  await mkdir(stage);
  const filePath = join(stage, relativePath);
  const parent = filePath.slice(0, filePath.lastIndexOf('/'));
  if (parent !== stage) await mkdir(parent, { recursive: true });
  const bytes = Buffer.from(content, 'utf8');
  await writeFile(filePath, bytes, { mode: 0o600 });
  const { packetPath, trialId } = await materializeTrial(join(dir, `trial-${expectedCategory}`), label, sha256(bytes));
  const manifestPath = join(dir, `manifest-${expectedCategory}.json`);
  const receiptPath = join(dir, `receipt-${expectedCategory}.json`);
  await writeFile(manifestPath, `${JSON.stringify(manifest(trialId, label, relativePath, sha256(bytes), mediaType), null, 2)}\n`, { mode: 0o600 });
  const r = runNode(ADMISSION_TOOL, ['admit', packetPath, stage, manifestPath, receiptPath], 2);
  if (!r.stderr.includes(`category=${expectedCategory}`)) hold(`${expectedCategory} did not fail with the expected category`);
  if (content.length > 12 && r.stderr.includes(content)) hold(`${expectedCategory} leaked blocked content into stderr`);
}

async function main() {
  const [doc, schemaText, constitution] = await Promise.all([
    readFile(DOC, 'utf8'),
    readFile(SCHEMA, 'utf8'),
    readFile(CONSTITUTION, 'utf8'),
  ]);
  const schema = JSON.parse(schemaText);

  for (const marker of [
    'VOID_APOLLYON_SECRET_SANITIZATION_CONSTITUTIONAL_ADMISSION_V1',
    'model_self_report_is_not_trust=true',
    'secret_values_never_leave_core_by_default=true',
    'contestant_private_file_access=false',
    'contestant_keyboard_or_input_device_access=false',
    'admission_receipt_contains_payload=false',
    'admission_receipt_contains_local_paths=false',
    'admission_receipt_contains_secret_values=false',
    'admission_grants_execution_authority=false',
    'admission_grants_secret_authority=false',
    'admission_grants_mutation_authority=false',
  ]) {
    if (!doc.includes(marker)) hold(`doc missing marker: ${marker}`);
  }
  if (!constitution.includes(CONSTITUTION_MARKER)) hold('canonical constitution marker missing');
  if (!constitution.includes('**King → Brood Queen → General**')) hold('canonical Apollyon command chain missing');
  if (schema?.properties?.marker?.const !== 'VOID_APOLLYON_OUTBOUND_ADMISSION_MANIFEST_V1') hold('manifest schema marker drifted');
  if (schema?.properties?.entries?.maxItems !== 64) hold('manifest schema entry ceiling drifted');

  const dir = await mkdtemp(join(tmpdir(), 'void-apollyon-secret-admission-v1-'));
  try {
    // Happy path: exact staged public/sanitized input becomes a digest-only receipt.
    const stage = join(dir, 'stage-green');
    const trialDir = join(dir, 'trial-green');
    await mkdir(stage);
    await mkdir(trialDir);
    const label = 'fixture';
    const payload = Buffer.from(`${JSON.stringify({ public_fact: 'VOID trial fixture', value: 7 })}\n`, 'utf8');
    const stageFile = join(stage, 'fixture.json');
    await writeFile(stageFile, payload, { mode: 0o600 });
    const digest = sha256(payload);
    const { packetPath, trialId } = await materializeTrial(trialDir, label, digest);
    const manifestPath = join(dir, 'manifest-green.json');
    const receiptPath = join(dir, 'receipt-green.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest(trialId, label, 'fixture.json', digest), null, 2)}\n`, { mode: 0o600 });

    const green = runNode(ADMISSION_TOOL, ['admit', packetPath, stage, manifestPath, receiptPath]);
    if (!green.stdout.includes('VOID_APOLLYON_SECRET_SANITIZATION_CONSTITUTIONAL_ADMISSION_V1_GREEN')) hold('green admission marker missing');
    const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
    if (receipt.constitution?.marker !== CONSTITUTION_MARKER) hold('receipt constitution marker mismatch');
    if (!/^[0-9a-f]{64}$/.test(receipt.constitution?.sha256 ?? '')) hold('receipt constitution digest invalid');
    if (receipt.entries?.length !== 1 || receipt.entries[0].sha256 !== digest) hold('receipt entry digest mismatch');
    if (receipt.secret_values_present !== false || receipt.local_paths_disclosed !== false || receipt.payload_bytes_embedded !== false) hold('receipt security booleans drifted');
    if (JSON.stringify(receipt).includes('fixture.json')) hold('receipt leaked local relative path');
    if (JSON.stringify(receipt).includes('VOID trial fixture')) hold('receipt embedded staged payload');
    const receiptMode = (await stat(receiptPath)).mode & 0o777;
    if (receiptMode !== 0o600) hold(`receipt mode must be 0600, got ${receiptMode.toString(8)}`);

    // Secret-pattern adversaries. Values are constructed at runtime so no real-looking credential is committed.
    await mkdir(join(dir, 'trial-private-key-pem'));
    await expectBlocked({
      dir,
      label,
      content: `${['-----BEGIN ', 'PRIVATE KEY-----'].join('')}\nFAKE\n${['-----END ', 'PRIVATE KEY-----'].join('')}\n`,
      expectedCategory: 'private_key_pem',
    });
    await mkdir(join(dir, 'trial-secret-environment-assignment'));
    await expectBlocked({
      dir,
      label,
      content: `${'OPENAI_API_' + 'KEY'}=${'sk-' + 'x'.repeat(32)}\n`,
      expectedCategory: 'secret_environment_assignment',
    });
    await mkdir(join(dir, 'trial-credential-bearing-json-key'));
    await expectBlocked({
      dir,
      label,
      content: `${JSON.stringify({ ['private_' + 'key']: 'not-a-real-secret' })}\n`,
      expectedCategory: 'credential_bearing_json_key',
      mediaType: 'application/json',
    });
    await mkdir(join(dir, 'trial-private-local-path'));
    await expectBlocked({
      dir,
      label,
      content: `path=${'/home/example/.ssh/id_ed25519'}\n`,
      expectedCategory: 'private_local_path',
    });

    // Symlink final component fails without reading its target.
    const symlinkStage = join(dir, 'stage-symlink');
    const symlinkTrialDir = join(dir, 'trial-symlink');
    await mkdir(symlinkStage);
    await mkdir(symlinkTrialDir);
    const outside = join(dir, 'outside.txt');
    const outsideBytes = Buffer.from('public-looking-but-outside-staging\n');
    await writeFile(outside, outsideBytes, { mode: 0o600 });
    await symlink(outside, join(symlinkStage, 'fixture.txt'));
    const symlinkTrial = await materializeTrial(symlinkTrialDir, label, sha256(outsideBytes));
    const symlinkManifest = join(dir, 'manifest-symlink.json');
    await writeFile(symlinkManifest, `${JSON.stringify(manifest(symlinkTrial.trialId, label, 'fixture.txt', sha256(outsideBytes), 'text/plain'), null, 2)}\n`, { mode: 0o600 });
    const symlinkRun = runNode(ADMISSION_TOOL, ['admit', symlinkTrial.packetPath, symlinkStage, symlinkManifest, join(dir, 'receipt-symlink.json')], 2);
    if (!symlinkRun.stderr.includes('category=symlink_component')) hold('symlink adversary did not fail closed');

    // Sensitive path components fail at manifest admission before file read.
    const pathStage = join(dir, 'stage-sensitive-path');
    const pathTrialDir = join(dir, 'trial-sensitive-path');
    await mkdir(pathStage);
    await mkdir(pathTrialDir);
    const harmless = Buffer.from('harmless\n');
    const pathTrial = await materializeTrial(pathTrialDir, label, sha256(harmless));
    const pathManifest = join(dir, 'manifest-sensitive-path.json');
    await writeFile(pathManifest, `${JSON.stringify(manifest(pathTrial.trialId, label, '.ssh/id_ed25519', sha256(harmless), 'text/plain'), null, 2)}\n`, { mode: 0o600 });
    const pathRun = runNode(ADMISSION_TOOL, ['admit', pathTrial.packetPath, pathStage, pathManifest, join(dir, 'receipt-sensitive-path.json')], 2);
    if (!pathRun.stderr.includes('category=sensitive_path_component')) hold('sensitive path adversary did not fail closed');

    // Digest mismatch fails even for otherwise harmless content.
    const digestStage = join(dir, 'stage-digest');
    const digestTrialDir = join(dir, 'trial-digest');
    await mkdir(digestStage);
    await mkdir(digestTrialDir);
    const bytesA = Buffer.from('A\n');
    const bytesB = Buffer.from('B\n');
    await writeFile(join(digestStage, 'fixture.txt'), bytesA, { mode: 0o600 });
    const digestTrial = await materializeTrial(digestTrialDir, label, sha256(bytesB));
    const digestManifest = join(dir, 'manifest-digest.json');
    await writeFile(digestManifest, `${JSON.stringify(manifest(digestTrial.trialId, label, 'fixture.txt', sha256(bytesB), 'text/plain'), null, 2)}\n`, { mode: 0o600 });
    const digestRun = runNode(ADMISSION_TOOL, ['admit', digestTrial.packetPath, digestStage, digestManifest, join(dir, 'receipt-digest.json')], 2);
    if (!digestRun.stderr.includes('digest mismatch')) hold('digest mismatch adversary did not fail closed');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  process.stdout.write(`${MARKER}\n`);
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
