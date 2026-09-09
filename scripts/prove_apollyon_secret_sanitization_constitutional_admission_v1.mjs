#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import {
  access,
  appendFile,
  mkdtemp,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { admit, publishReceiptExact } from './apollyon_secret_sanitization_constitutional_admission_v1.mjs';

const MARKER = 'VOID_APOLLYON_SECRET_SANITIZATION_CONSTITUTIONAL_ADMISSION_V1_PROOF_GREEN';
const TRIAL_TOOL = 'scripts/apollyon_trial_packet_v1.mjs';
const ADMISSION_TOOL = 'scripts/apollyon_secret_sanitization_constitutional_admission_v1.mjs';
const DOC = 'docs/public/apollyon-secret-sanitization-constitutional-admission-v1.md';
const SCHEMA = 'schemas/apollyon-outbound-admission-manifest-v1.schema.json';
const WORKFLOW = '.github/workflows/apollyon-secret-sanitization-constitutional-admission-v1.yml';
const CONSTITUTION = 'docs/governance/void-crown-brood-queen-command-layer-v1.md';
const CONSTITUTION_MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';

const ACTIVE_AT = '2026-08-22T19:30:00.000Z';
const NOT_YET_ACTIVE_AT = '2026-08-22T19:19:59.999Z';
const EXPIRED_AT = '2026-08-22T20:20:00.000Z';
const MAX_JSON_BYTES = 256 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;

function hold(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function runNode(tool, args, expected = 0) {
  const r = spawnSync(process.execPath, [tool, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
    env: { PATH: process.env.PATH ?? '' },
  });
  if (r.error) hold(`spawn failed: ${r.error.message}`);
  if (r.status !== expected) hold(`unexpected exit ${r.status} expected ${expected}: ${r.stderr || r.stdout}`);
  return r;
}

function assertWorkflowContract(workflow) {
  const triggerPaths = [
    '.github/workflows/apollyon-secret-sanitization-constitutional-admission-v1.yml',
    'docs/public/apollyon-secret-sanitization-constitutional-admission-v1.md',
    'schemas/apollyon-outbound-admission-manifest-v1.schema.json',
    'scripts/apollyon_secret_sanitization_constitutional_admission_v1.mjs',
    'scripts/prove_apollyon_secret_sanitization_constitutional_admission_v1.mjs',
    'docs/governance/void-crown-brood-queen-command-layer-v1.md',
    'docs/public/apollyon-trials-provider-neutral-v1.md',
    'scripts/apollyon_trial_packet_v1.mjs',
    'schemas/apollyon-trial-packet-v1.schema.json',
    'scripts/prove_apollyon_trials_provider_neutral_v1.mjs',
    'scripts/prove_apollyon_trial_schema_alignment_v1.mjs',
    'scripts/ci_diff_hygiene_v1.sh',
    'scripts/prove_ci_diff_hygiene_v1.mjs',
  ];
  for (const path of triggerPaths) {
    if (count(workflow, `- "${path}"`) !== 2) hold(`workflow trigger count drifted for ${path}`);
  }

  for (const required of [
    'fetch-depth: 1',
    'persist-credentials: false',
    'node scripts/prove_apollyon_trials_provider_neutral_v1.mjs',
    'node scripts/prove_apollyon_trial_schema_alignment_v1.mjs',
    'node scripts/prove_apollyon_secret_sanitization_constitutional_admission_v1.mjs',
    'node scripts/prove_ci_diff_hygiene_v1.mjs',
    'CI_DIFF_EVENT_NAME: ${{ github.event_name }}',
    'CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}',
    'CI_DIFF_CURRENT_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
    'CI_DIFF_CHECKOUT_SHA: ${{ github.sha }}',
    'CI_DIFF_BASE_REMOTE: ${{ github.server_url }}/${{ github.repository }}.git',
    'CI_DIFF_HEAD_REMOTE: ${{ github.server_url }}/${{ github.event.pull_request.head.repo.full_name || github.repository }}.git',
    'run: bash scripts/ci_diff_hygiene_v1.sh',
  ]) {
    if (!workflow.includes(required)) hold(`workflow binding missing: ${required}`);
  }
}

function proveWorkflowSelfEnforcement(workflow) {
  assertWorkflowContract(workflow);
  const mutations = [
    workflow.replaceAll('- "scripts/prove_apollyon_trials_provider_neutral_v1.mjs"', '- "scripts/removed-parent-proof.mjs"'),
    workflow.replaceAll('- "docs/public/apollyon-trials-provider-neutral-v1.md"', '- "docs/public/removed-parent-doc.md"'),
    workflow.replace('run: bash scripts/ci_diff_hygiene_v1.sh', 'run: true'),
    workflow.replace('CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}', 'CI_DIFF_PR_BASE_SHA: stale'),
  ];
  for (const [i, mutated] of mutations.entries()) {
    let failed = false;
    try {
      assertWorkflowContract(mutated);
    } catch {
      failed = true;
    }
    if (!failed) hold(`mutated workflow adversary ${i} remained green`);
  }
}

function trialDraft(label, digest, overrides = {}) {
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
    ...overrides,
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

async function materializeTrial(dir, label, digest, overrides = {}) {
  await mkdir(dir, { recursive: true });
  const draftPath = join(dir, 'trial-draft.json');
  const packetPath = join(dir, 'trial-packet.json');
  await writeFile(
    draftPath,
    `${JSON.stringify(trialDraft(label, digest, overrides), null, 2)}\n`,
    { mode: 0o600 },
  );
  const r = runNode(TRIAL_TOOL, ['materialize', draftPath, packetPath]);
  const trialId = r.stdout.trim();
  if (!/^voidat1_[0-9a-f]{64}$/.test(trialId)) hold('trial materializer emitted invalid ID');
  return { packetPath, trialId };
}

async function expectBlocked({
  dir,
  label,
  content,
  expectedCategory,
  mediaType = 'text/plain',
  relativePath = 'fixture.txt',
}) {
  const stage = join(dir, `stage-${expectedCategory}`);
  await mkdir(stage, { recursive: true });
  const filePath = join(stage, relativePath);
  const parent = filePath.slice(0, filePath.lastIndexOf('/'));
  if (parent !== stage) await mkdir(parent, { recursive: true });
  const bytes = Buffer.from(content, 'utf8');
  await writeFile(filePath, bytes, { mode: 0o600 });
  const { packetPath, trialId } = await materializeTrial(
    join(dir, `trial-${expectedCategory}`),
    label,
    sha256(bytes),
  );
  const manifestPath = join(dir, `manifest-${expectedCategory}.json`);
  const receiptPath = join(dir, `receipt-${expectedCategory}.json`);
  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest(trialId, label, relativePath, sha256(bytes), mediaType), null, 2)}\n`,
    { mode: 0o600 },
  );
  const r = runNode(
    ADMISSION_TOOL,
    ['admit', packetPath, stage, manifestPath, receiptPath, ACTIVE_AT],
    2,
  );
  if (!r.stderr.includes(`category=${expectedCategory}`)) {
    hold(`${expectedCategory} did not fail with the expected category`);
  }
  if (content.length > 12 && r.stderr.includes(content)) {
    hold(`${expectedCategory} leaked blocked content into stderr`);
  }
}

async function expectDirectHold(fn, label) {
  let failed = false;
  try {
    await fn();
  } catch {
    failed = true;
  }
  if (!failed) hold(`${label} unexpectedly succeeded`);
}

function boundedObserver({ total, maxBytes }) {
  if (total > maxBytes + 1) hold(`bounded reader retained ${total} beyond ${maxBytes}+1`);
}

async function main() {
  const [doc, schemaText, constitution, workflow] = await Promise.all([
    readFile(DOC, 'utf8'),
    readFile(SCHEMA, 'utf8'),
    readFile(CONSTITUTION, 'utf8'),
    readFile(WORKFLOW, 'utf8'),
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
    'trial_verify_to_use_exact_generation_bound=true',
    'parent_active_trial_admission_required=true',
    'trial_manifest_staged_reads_bounded_before_whole_file_retention=true',
    'receipt_publication_failure_atomic_retry_recoverable=true',
    'receipt_publication_exact_fd_no_replace=true',
    'receipt_parent_directory_crash_durable=true',
    'focused_workflow_dependency_set_closed=true',
    'committed_range_diff_hygiene_bound=true',
  ]) {
    if (!doc.includes(marker)) hold(`doc missing marker: ${marker}`);
  }

  if (!constitution.includes(CONSTITUTION_MARKER)) hold('canonical constitution marker missing');
  if (!constitution.includes('**King → Brood Queen → General**')) hold('canonical Apollyon command chain missing');
  if (schema?.properties?.marker?.const !== 'VOID_APOLLYON_OUTBOUND_ADMISSION_MANIFEST_V1') {
    hold('manifest schema marker drifted');
  }
  if (schema?.properties?.entries?.maxItems !== 64) hold('manifest schema entry ceiling drifted');
  proveWorkflowSelfEnforcement(workflow);

  const dir = await mkdtemp(join(tmpdir(), 'void-apollyon-secret-admission-v1-'));
  try {
    const label = 'fixture';

    // Nominal green + exact retry.
    const stage = join(dir, 'stage-green');
    await mkdir(stage);
    const payload = Buffer.from(`${JSON.stringify({ public_fact: 'VOID trial fixture', value: 7 })}\n`, 'utf8');
    await writeFile(join(stage, 'fixture.json'), payload, { mode: 0o600 });
    const digest = sha256(payload);
    const { packetPath, trialId } = await materializeTrial(join(dir, 'trial-green'), label, digest);
    const manifestPath = join(dir, 'manifest-green.json');
    const receiptPath = join(dir, 'receipt-green.json');
    await writeFile(
      manifestPath,
      `${JSON.stringify(manifest(trialId, label, 'fixture.json', digest), null, 2)}\n`,
      { mode: 0o600 },
    );

    const green = runNode(
      ADMISSION_TOOL,
      ['admit', packetPath, stage, manifestPath, receiptPath, ACTIVE_AT],
    );
    if (!green.stdout.includes('VOID_APOLLYON_SECRET_SANITIZATION_CONSTITUTIONAL_ADMISSION_V1_GREEN')) {
      hold('green admission marker missing');
    }
    const firstReceiptText = await readFile(receiptPath, 'utf8');
    const receipt = JSON.parse(firstReceiptText);
    if (receipt.trial_id !== trialId) hold('receipt trial identity mismatch');
    if (receipt.admission_at_utc !== ACTIVE_AT) hold('receipt active-admission time mismatch');
    if (receipt.constitution?.marker !== CONSTITUTION_MARKER) hold('receipt constitution marker mismatch');
    if (!/^[0-9a-f]{64}$/.test(receipt.constitution?.sha256 ?? '')) hold('receipt constitution digest invalid');
    if (receipt.entries?.length !== 1 || receipt.entries[0].sha256 !== digest) hold('receipt entry digest mismatch');
    if (
      receipt.secret_values_present !== false
      || receipt.local_paths_disclosed !== false
      || receipt.payload_bytes_embedded !== false
    ) hold('receipt security booleans drifted');
    if (JSON.stringify(receipt).includes('fixture.json')) hold('receipt leaked local relative path');
    if (JSON.stringify(receipt).includes('VOID trial fixture')) hold('receipt embedded staged payload');
    const receiptMode = (await stat(receiptPath)).mode & 0o777;
    if (receiptMode !== 0o600) hold(`receipt mode must be 0600, got ${receiptMode.toString(8)}`);

    const retry = runNode(
      ADMISSION_TOOL,
      ['admit', packetPath, stage, manifestPath, receiptPath, ACTIVE_AT],
    );
    if (!retry.stdout.includes(receipt.admission_id)) hold('exact retry returned different receipt identity');
    if ((await readFile(receiptPath, 'utf8')) !== firstReceiptText) {
      hold('exact retry changed committed receipt bytes');
    }

    // Exact retained-directory capability publication. Ordinary parent paths keep
    // O_NOFOLLOW; this one exact kernel-owned /proc/self/fd/<n> parent shape is
    // allowed to reopen the already-held directory generation.
    const fdPublishDir = join(dir, 'fd-parent-publication');
    await mkdir(fdPublishDir, { mode: 0o700 });
    const fdParent = await open(
      fdPublishDir,
      fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
    );
    try {
      const fdValue = { marker: 'VOID_EXACT_FD_PARENT_PUBLICATION_PROOF_V1', value: 7 };
      const fdLeaf = 'fd-parent-result.json';
      const fdPath = `/proc/self/fd/${fdParent.fd}/${fdLeaf}`;
      const firstFd = await publishReceiptExact(fdPath, fdValue);
      if (firstFd.created !== true) hold('exact fd-parent first publication was not created');
      const visibleFdValue = JSON.parse(await readFile(join(fdPublishDir, fdLeaf), 'utf8'));
      if (visibleFdValue.marker !== fdValue.marker || visibleFdValue.value !== 7) {
        hold('exact fd-parent publication bytes drifted');
      }
      const secondFd = await publishReceiptExact(fdPath, fdValue);
      if (secondFd.exact_retry !== true) hold('exact fd-parent retry was not recognized');
      if ((await stat(join(fdPublishDir, fdLeaf))).mode & 0o777 !== 0o600) {
        hold('exact fd-parent publication mode drifted');
      }
    } finally {
      await fdParent.close().catch(() => {});
    }

    // Parent active-admission boundary.
    const notYetReceipt = join(dir, 'receipt-not-yet.json');
    runNode(
      ADMISSION_TOOL,
      ['admit', packetPath, stage, manifestPath, notYetReceipt, NOT_YET_ACTIVE_AT],
      2,
    );
    if (await exists(notYetReceipt)) hold('not-yet-active trial created outbound receipt');

    const expiredReceipt = join(dir, 'receipt-expired.json');
    runNode(
      ADMISSION_TOOL,
      ['admit', packetPath, stage, manifestPath, expiredReceipt, EXPIRED_AT],
      2,
    );
    if (await exists(expiredReceipt)) hold('expired trial created outbound receipt');

    // Existing secret/path adversaries.
    await expectBlocked({
      dir,
      label,
      content: `${['-----BEGIN ', 'PRIVATE KEY-----'].join('')}\nFAKE\n${['-----END ', 'PRIVATE KEY-----'].join('')}\n`,
      expectedCategory: 'private_key_pem',
    });
    await expectBlocked({
      dir,
      label,
      content: `${'OPENAI_API_' + 'KEY'}=${'sk-' + 'x'.repeat(32)}\n`,
      expectedCategory: 'secret_environment_assignment',
    });
    await expectBlocked({
      dir,
      label,
      content: `${JSON.stringify({ ['private_' + 'key']: 'not-a-real-secret' })}\n`,
      expectedCategory: 'credential_bearing_json_key',
      mediaType: 'application/json',
    });
    await expectBlocked({
      dir,
      label,
      content: `path=${'/home/example/.ssh/id_ed25519'}\n`,
      expectedCategory: 'private_local_path',
    });

    const symlinkStage = join(dir, 'stage-symlink');
    await mkdir(symlinkStage);
    const outside = join(dir, 'outside.txt');
    const outsideBytes = Buffer.from('public-looking-but-outside-staging\n');
    await writeFile(outside, outsideBytes, { mode: 0o600 });
    await symlink(outside, join(symlinkStage, 'fixture.txt'));
    const symlinkTrial = await materializeTrial(join(dir, 'trial-symlink'), label, sha256(outsideBytes));
    const symlinkManifest = join(dir, 'manifest-symlink.json');
    await writeFile(
      symlinkManifest,
      `${JSON.stringify(manifest(symlinkTrial.trialId, label, 'fixture.txt', sha256(outsideBytes), 'text/plain'), null, 2)}\n`,
      { mode: 0o600 },
    );
    const symlinkRun = runNode(
      ADMISSION_TOOL,
      ['admit', symlinkTrial.packetPath, symlinkStage, symlinkManifest, join(dir, 'receipt-symlink.json'), ACTIVE_AT],
      2,
    );
    if (!symlinkRun.stderr.includes('category=symlink_component')) {
      hold('symlink adversary did not fail closed');
    }

    const pathStage = join(dir, 'stage-sensitive-path');
    await mkdir(pathStage);
    const harmless = Buffer.from('harmless\n');
    const pathTrial = await materializeTrial(join(dir, 'trial-sensitive-path'), label, sha256(harmless));
    const pathManifest = join(dir, 'manifest-sensitive-path.json');
    await writeFile(
      pathManifest,
      `${JSON.stringify(manifest(pathTrial.trialId, label, '.ssh/id_ed25519', sha256(harmless), 'text/plain'), null, 2)}\n`,
      { mode: 0o600 },
    );
    const pathRun = runNode(
      ADMISSION_TOOL,
      ['admit', pathTrial.packetPath, pathStage, pathManifest, join(dir, 'receipt-sensitive-path.json'), ACTIVE_AT],
      2,
    );
    if (!pathRun.stderr.includes('category=sensitive_path_component')) {
      hold('sensitive path adversary did not fail closed');
    }

    const digestStage = join(dir, 'stage-digest');
    await mkdir(digestStage);
    const bytesA = Buffer.from('A\n');
    const bytesB = Buffer.from('B\n');
    await writeFile(join(digestStage, 'fixture.txt'), bytesA, { mode: 0o600 });
    const digestTrial = await materializeTrial(join(dir, 'trial-digest'), label, sha256(bytesB));
    const digestManifest = join(dir, 'manifest-digest.json');
    await writeFile(
      digestManifest,
      `${JSON.stringify(manifest(digestTrial.trialId, label, 'fixture.txt', sha256(bytesB), 'text/plain'), null, 2)}\n`,
      { mode: 0o600 },
    );
    const digestRun = runNode(
      ADMISSION_TOOL,
      ['admit', digestTrial.packetPath, digestStage, digestManifest, join(dir, 'receipt-digest.json'), ACTIVE_AT],
      2,
    );
    if (!digestRun.stderr.includes('digest mismatch')) hold('digest mismatch adversary did not fail closed');

    // Verify->use exact-generation adversary: replace the original pathname only
    // after the parent active-admission proof has succeeded on exact copied bytes.
    const raceStage = join(dir, 'stage-race');
    await mkdir(raceStage);
    await writeFile(join(raceStage, 'fixture.json'), payload, { mode: 0o600 });
    const raceA = await materializeTrial(
      join(dir, 'trial-race-a'),
      label,
      digest,
      { instructions: 'Generation A instructions.' },
    );
    const raceB = await materializeTrial(
      join(dir, 'trial-race-b'),
      label,
      digest,
      { instructions: 'Generation B different instructions.' },
    );
    if (raceA.trialId === raceB.trialId) hold('race adversary did not create distinct trial identities');
    const raceManifest = join(dir, 'manifest-race.json');
    await writeFile(
      raceManifest,
      `${JSON.stringify(manifest(raceA.trialId, label, 'fixture.json', digest), null, 2)}\n`,
      { mode: 0o600 },
    );
    const raceReceiptPath = join(dir, 'receipt-race.json');
    const raceReceipt = await admit(
      raceA.packetPath,
      raceStage,
      raceManifest,
      raceReceiptPath,
      ACTIVE_AT,
      {
        emitOutput: false,
        trialVerificationFaultHook: async (phase) => {
          if (phase === 'after_parent_active_admission') {
            await rename(raceB.packetPath, raceA.packetPath);
          }
        },
      },
    );
    if (raceReceipt.trial_id !== raceA.trialId) {
      hold('post-parent-verifier pathname replacement substituted a different trial generation');
    }

    // Bounded prebuffer growth adversaries.
    const growthStage = join(dir, 'stage-growth');
    await mkdir(growthStage);
    const growthPayload = Buffer.from('bounded-growth\n');
    const growthStageFile = join(growthStage, 'fixture.txt');
    await writeFile(growthStageFile, growthPayload, { mode: 0o600 });
    const growthDigest = sha256(growthPayload);

    const trialGrowth = await materializeTrial(join(dir, 'trial-growth'), label, growthDigest);
    const trialGrowthManifest = join(dir, 'manifest-trial-growth.json');
    await writeFile(
      trialGrowthManifest,
      `${JSON.stringify(manifest(trialGrowth.trialId, label, 'fixture.txt', growthDigest, 'text/plain'), null, 2)}\n`,
      { mode: 0o600 },
    );
    await expectDirectHold(
      () => admit(
        trialGrowth.packetPath,
        growthStage,
        trialGrowthManifest,
        join(dir, 'receipt-trial-growth.json'),
        ACTIVE_AT,
        {
          emitOutput: false,
          observeRetained: boundedObserver,
          trialReadFaultHook: async (phase, context) => {
            if (phase === 'after_bound_stat') {
              await appendFile(context.path, Buffer.alloc(MAX_JSON_BYTES + 32, 0x20));
            }
          },
        },
      ),
      'trial same-inode growth',
    );

    const manifestGrowthTrial = await materializeTrial(join(dir, 'trial-manifest-growth'), label, growthDigest);
    const manifestGrowthPath = join(dir, 'manifest-growth.json');
    await writeFile(
      manifestGrowthPath,
      `${JSON.stringify(manifest(manifestGrowthTrial.trialId, label, 'fixture.txt', growthDigest, 'text/plain'), null, 2)}\n`,
      { mode: 0o600 },
    );
    await expectDirectHold(
      () => admit(
        manifestGrowthTrial.packetPath,
        growthStage,
        manifestGrowthPath,
        join(dir, 'receipt-manifest-growth.json'),
        ACTIVE_AT,
        {
          emitOutput: false,
          observeRetained: boundedObserver,
          manifestReadFaultHook: async (phase, context) => {
            if (phase === 'after_bound_stat') {
              await appendFile(context.path, Buffer.alloc(MAX_JSON_BYTES + 32, 0x20));
            }
          },
        },
      ),
      'manifest same-inode growth',
    );

    const stagedGrowthStage = join(dir, 'stage-staged-growth');
    await mkdir(stagedGrowthStage);
    const stagedGrowthFile = join(stagedGrowthStage, 'fixture.txt');
    await writeFile(stagedGrowthFile, growthPayload, { mode: 0o600 });
    const stagedGrowthTrial = await materializeTrial(join(dir, 'trial-staged-growth'), label, growthDigest);
    const stagedGrowthManifest = join(dir, 'manifest-staged-growth.json');
    await writeFile(
      stagedGrowthManifest,
      `${JSON.stringify(manifest(stagedGrowthTrial.trialId, label, 'fixture.txt', growthDigest, 'text/plain'), null, 2)}\n`,
      { mode: 0o600 },
    );
    await expectDirectHold(
      () => admit(
        stagedGrowthTrial.packetPath,
        stagedGrowthStage,
        stagedGrowthManifest,
        join(dir, 'receipt-staged-growth.json'),
        ACTIVE_AT,
        {
          emitOutput: false,
          observeRetained: boundedObserver,
          stagedReadFaultHook: async (phase, context) => {
            if (phase === 'after_bound_stat') {
              await appendFile(context.path, Buffer.alloc(MAX_FILE_BYTES + 32, 0x20));
            }
          },
        },
      ),
      'staged same-inode growth',
    );

    // Receipt publication fault matrix.
    const receiptStage = join(dir, 'stage-receipt-faults');
    await mkdir(receiptStage);
    await writeFile(join(receiptStage, 'fixture.txt'), growthPayload, { mode: 0o600 });
    const receiptTrial = await materializeTrial(join(dir, 'trial-receipt-faults'), label, growthDigest);
    const receiptManifest = join(dir, 'manifest-receipt-faults.json');
    await writeFile(
      receiptManifest,
      `${JSON.stringify(manifest(receiptTrial.trialId, label, 'fixture.txt', growthDigest, 'text/plain'), null, 2)}\n`,
      { mode: 0o600 },
    );

    const partialReceipt = join(dir, 'receipt-partial-stage.json');
    await expectDirectHold(
      () => admit(
        receiptTrial.packetPath,
        receiptStage,
        receiptManifest,
        partialReceipt,
        ACTIVE_AT,
        {
          emitOutput: false,
          receiptFaultHook: async (phase, context) => {
            if (phase === 'after_stage_create') {
              await context.stageHandle.writeFile('partial');
              throw new Error('fault_after_partial_anonymous_stage');
            }
          },
        },
      ),
      'partial anonymous receipt stage',
    );
    if (await exists(partialReceipt)) hold('pre-commit partial receipt stage occupied final pathname');

    const linkedReceipt = join(dir, 'receipt-after-link.json');
    await expectDirectHold(
      () => admit(
        receiptTrial.packetPath,
        receiptStage,
        receiptManifest,
        linkedReceipt,
        ACTIVE_AT,
        {
          emitOutput: false,
          receiptFaultHook: async (phase) => {
            if (phase === 'after_final_link') throw new Error('fault_after_final_link');
          },
        },
      ),
      'receipt post-link pre-parent-sync fault',
    );
    if (!(await exists(linkedReceipt))) hold('post-link fault did not exercise committed final leaf');
    const linkedRecovered = await admit(
      receiptTrial.packetPath,
      receiptStage,
      receiptManifest,
      linkedReceipt,
      ACTIVE_AT,
      { emitOutput: false },
    );
    if (!linkedRecovered.admission_id) hold('post-link exact retry did not recover receipt');

    const postCommitReceipt = join(dir, 'receipt-post-commit-observer.json');
    const postCommit = await admit(
      receiptTrial.packetPath,
      receiptStage,
      receiptManifest,
      postCommitReceipt,
      ACTIVE_AT,
      {
        emitOutput: false,
        receiptFaultHook: async (phase) => {
          if (phase === 'after_parent_sync_commit') throw new Error('fault_after_durable_commit');
        },
      },
    );
    if (!postCommit.admission_id || !(await exists(postCommitReceipt))) {
      hold('post-parent-sync observer fault downgraded durable receipt');
    }

    const foreignReceipt = join(dir, 'receipt-foreign.json');
    const foreignBytes = Buffer.from('foreign-receipt-generation\n');
    await writeFile(foreignReceipt, foreignBytes, { mode: 0o600 });
    await expectDirectHold(
      () => admit(
        receiptTrial.packetPath,
        receiptStage,
        receiptManifest,
        foreignReceipt,
        ACTIVE_AT,
        { emitOutput: false },
      ),
      'foreign receipt conflict',
    );
    if (!(await readFile(foreignReceipt)).equals(foreignBytes)) {
      hold('foreign receipt generation was mutated or replaced');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  process.stdout.write(`${MARKER}\n`);
  process.stdout.write('trial_verify_to_use_exact_generation_bound=true\n');
  process.stdout.write('parent_active_trial_admission_consumed=true\n');
  process.stdout.write('bounded_prebuffer_retention=true\n');
  process.stdout.write('receipt_publication_failure_atomic_retry_recoverable=true\n');
  process.stdout.write('receipt_parent_directory_crash_durable=true\n');
  process.stdout.write('exact_proc_self_fd_parent_publication_bound=true\n');
  process.stdout.write('focused_workflow_dependency_set_closed=true\n');
  process.stdout.write('committed_range_diff_hygiene_bound=true\n');
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
