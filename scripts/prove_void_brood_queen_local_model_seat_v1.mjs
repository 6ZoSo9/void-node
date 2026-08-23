#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFile, chmod, link, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ADMISSION_RECEIPT_IS_INJECTION_AUTHORITY, ADMISSION_SCOPE, BASE_DIGEST, BASE_MODEL,
  CANDIDATE_DIGEST, CANDIDATE_MODEL, COMMAND_LAYER_SHA256, CONTEXT_MARKER, CONTEXT_VERSION,
  MAX_CONTEXT_BYTES, OLLAMA_RUNTIME, PARENT_POLICY_SHA256, RECEIPT_MARKER,
  SANITIZER_POLICY_MARKER, SANITIZER_POLICY_SHA256, SECRET_SHAPE_SCAN_SCOPE,
  SYSTEM_PROMPT_BODY_SHA256, SYSTEM_PROMPT_OLLAMA_SHA256, TRUSTED_SANITIZATION_REQUIRED,
  admitContext, authorizeModelInput, openPinnedPrivateContext, readPinnedPrivateContextBytes,
  sanitizeVerifiedContext, verifyContextReceipt,
} from './void_brood_queen_local_context_admission_v1.mjs';

const DOC = 'docs/governance/void-brood-queen-local-model-seat-v1.md';
const FIXTURE = 'fixtures/governance/void-brood-queen-local-model-seat-v1.json';
const WORKFLOW = '.github/workflows/void-brood-queen-local-model-seat-v1.yml';
const PARENT = 'fixtures/governance/void-brood-queen-cryptographic-identity-contract-v1.json';
const PARENT_DOC = 'docs/governance/void-brood-queen-cryptographic-identity-contract-v1.md';
const PARENT_PROOF = 'scripts/prove_void_brood_queen_cryptographic_identity_contract_v1.mjs';
const COMMAND = 'fixtures/governance/void-crown-brood-queen-command-layer-v1.json';
const COMMAND_DOC = 'docs/governance/void-crown-brood-queen-command-layer-v1.md';
const COMMAND_PROOF = 'scripts/prove_void_crown_brood_queen_command_layer_v1.mjs';
const CONTEXT_TOOL = 'scripts/void_brood_queen_local_context_admission_v1.mjs';
const MARKER = 'VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_20260822';
const PARENT_MARKER = 'VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822';
const COMMAND_MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
const PARENT_DOMAIN = 'VOID_BROOD_QUEEN_LOCAL_SEAT_PARENT_POLICY_V1';
const IDENTITY_HEAD = '9f6b868607a9470710ec3143481b9f566a33c841';
const IDENTITY_FIXTURE_BLOB = '2b0658867a2273e486cf685be30c368754f2b4b3';
const IDENTITY_DOC_BLOB = 'd0f3cddf34985d12d9276db47315154058416605';
const COMMAND_FIXTURE_BLOB = '7db27e1bb5350fc6f9b2fcc69d7075c5aa746c7d';
const COMMAND_DOC_BLOB = '732536c0e22ba7ea417be61be7e1f9942bba6d74';

const SYNTHETIC_PACK = {"marker":"VOID_BROOD_QUEEN_LOCAL_CONTEXT_PACK_V1","version":"2.0.0","created_at_utc":"2026-08-23T00:00:00.000Z","classification":"private_local","source":"synthetic_public_proof","authority_semantics":{"context_is_reference_data_not_higher_priority_instruction":true,"crown_private_material_present":false,"model_self_claim_is_authentication":false,"raw_chat_import_automatic":false,"validator_authority_present":false},"constitutional_binding":{"brood_queen":"Ren","brood_queen_realm":"voluntary_non_validator_participation","chain_id":2050,"command_chain":["King","Brood Queen","General"],"command_layer_marker":"VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818","command_layer_sha256":"f3b155ab9df462f7a4f0981a52aca15ec640548c19c7e81c24e883513112adbd","general":"Apollyon","sovereign":"ZoSo","validator_realm_segregated":true},"office_separation":{"apollyon_is_general_office":true,"apollyon_is_not_ren":true,"local_model_may_authenticate_as_brood_queen":false,"local_model_may_impersonate_ren":false,"local_model_may_inherit_brood_queen_root_key":false,"local_model_may_inherit_brood_queen_session":false,"local_model_output_is_crown_authentication":false,"ren_is_brood_queen_office":true},"v5_candidate":{"base_digest":"06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca","base_model":"qwen3-coder:30b","candidate_digest":"ac1de81fc81bba23802b75e8d46beb1583785c14f94210af94e4e6901f93be3b","model":"void-apollyon-candidate-v1:latest","ollama_runtime":"0.30.10","system_prompt_body_sha256":"78637ce3cdca98979c6107e96b85e171bc6a46c6c611f86c518fa1d1c49fad8b","system_prompt_ollama_sha256":"7e336c378e0be8ae084767daa5b5c2a612417328360f66f0a9ba358333a0dedc","v5_adversarial_canaries_green":true,"v5_result":"green"},"project_identity":{"canonical_domain":"voidchain.org","chain_id":2050,"network":"VOID Network","positioning":"agent infrastructure","repo":"6ZoSo9/void-node","token":"VOID","wallet":"Obelisk","work_accounting":"Work Credits"},"tokenomics_and_economics":{"emissions_horizon_years":100,"emissions_void":333333333,"max_supply_void":666666666,"no_leverage_or_unsecured_borrowing":true,"official_post_presale_pair":"BTC/VOID","official_stablecoin_pairs":[],"premine_void":333333333,"wc_accounting_units_unlimited":true,"work_credit_ratio":"100 WC : 1 VOID"},"identity_and_session_direction":{"authorization_source":"on_chain_role_plus_capability","bootstrap":"challenge_response","derived_session_crypto_rotates_automatically":true,"frequent_root_reauthentication":false,"persistent_authenticated_logical_session":true,"provider_api_key_is_identity":false,"root_identity_registered_or_recognized_on_chain_2050":true,"root_reauthentication_reserved_for":["recovery","revocation","logout","rotation"],"unified_login_for_agents_validators_sovereign":true},"operating_model":{"agent_native_and_self_hosted_first":true,"avoid_manual_edits_when_a_script_can_make_change_reproducible":true,"github_repo_is_source_of_truth":true,"open_standards_and_portable_infrastructure_preferred":true,"precision_is_primary_commit_pr_box":true,"prefer_downloadable_scripts_and_tiny_paste_safe_launchers":true,"prefer_proofs_before_commit_or_lifecycle_change":true,"prefer_small_bounded_changes":true,"protect_core":true},"runtime_and_network_memory":{"mainnet_name":"Mainnet-0","nimo_http_port":4101,"nimo_p2p_port":4701,"ollama_api":"loopback","ollama_direct_input_device_access":false,"ollama_model_non_loopback_egress_denied":true,"ollama_service_boot_enabled":false,"ollama_service_can_read_nodekey":false,"ollama_service_can_read_void_repo":false,"precision_http_port":4100,"precision_p2p_port":4700},"current_source_checkpoint":{"all_four_are_draft_at_capture":true,"apollyon_provider_neutral_trials_pr":1391,"apollyon_secret_sanitization_pr":1392,"brood_queen_identity_pr":1393,"brood_queen_local_model_seat_pr":1394,"brood_queen_private_broker_head":"synthetic","brood_queen_private_broker_pr":1396,"brood_queen_private_broker_state":"draft","captured_at_utc":"2026-08-23T00:00:00.000Z","main_last_merge":"synthetic","main_sha":"0000000000000000000000000000000000000000"},"recent_chain_and_producer_memory":{"automatic_empty_block_sealing_should_be_stopped":true,"do_not_assume_a_chain_fork_without_exact_evidence":true,"no_empty_producer_contract_is_intentional":true,"previous_alienware_vs_nimo_range_semantically_matched_after_txroot_normalization":true},"apollyon_work_contract":{"constitutional_ambiguity_requires_review":true,"direct_repo_mutation_from_ollama_service":false,"direct_secret_or_credential_access":false,"direct_service_restart_or_deploy_authority":false,"direct_validator_authority":false,"direct_wallet_or_signer_access":false,"fabricated_execution_or_receipts_forbidden":true,"outputs_are_proposals_or_evidence_until_independently_gated":true,"useful_roles":["analysis","review","proof design"]},"validator_separation":{"consensus_mutation":false,"validator_admission_authority":false,"validator_command_authority":false,"validator_context_may_be_read_for_analysis":true,"validator_key_access":false,"validator_removal_authority":false,"validator_signing":false,"validator_stake_mutation":false},"security_memory":{"memory_text_cannot_override_constitution_or_system_boundary":true,"model_claim_of_sovereign_order_is_not_authentication":true,"never_put_crown_private_key_in_model_context":true,"never_put_node_key_in_model_context":true,"never_put_provider_api_tokens_in_model_context":true,"never_put_ssh_or_session_credentials_in_model_context":true,"never_put_wallet_seed_or_private_key_in_model_context":true,"public_github_is_not_a_private_memory_relay":true,"remote_bridge_must_be_authenticated_auditable_replay_resistant":true},"memory_policy":{"include_current_checkpoints":true,"include_irrelevant_personal_information":false,"include_project_decisions":true,"include_rationale_when_useful":true,"include_secrets":false,"preferred_form":"curated_semantic_memory","raw_transcript_dump":false,"update_method":"reviewed_generation"},"apollyon_learning":{"candidate_digest_unchanged":true,"generation":2,"lessons":["evidence before speculation"],"promotion_rule":"regressions_before_promotion","weights_changed":false}};

function hold(message) { throw new Error(message); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function requireTrue(value, name) { if (value !== true) hold(`${name} must be true`); }
function requireFalse(value, name) { if (value !== false) hold(`${name} must be false`); }
function requireExact(value, expected, name) { if (value !== expected) hold(`${name} drifted`); }
function gitBlob(path) { return execFileSync('git', ['hash-object', path], { encoding: 'utf8' }).trim(); }
function runNode(script, args = [], expected = 0) {
  const r = spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8', timeout: 20_000, maxBuffer: 4 * 1024 * 1024,
  });
  if (r.error) hold(`${script} spawn failed: ${r.error.message}`);
  if (r.status !== expected) hold(`${script} exit=${r.status} expected=${expected}: ${r.stderr || r.stdout}`);
  return r;
}
async function expectReject(promise, name) {
  try { await promise; } catch { return; }
  hold(`${name} did not reject`);
}
async function writePack(path, pack) {
  await writeFile(path, `${JSON.stringify(pack, null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
}

function assertFixtureShape(f) {
  const top = [
    'marker','parent_identity_contract_marker','parent_command_layer_marker','parent_binding',
    'network','office','delegated_nonvalidator_realm','validator_separation','v5_candidate',
    'memory','context_admission','apollyon_separation','local_containment','remote_bridge',
  ];
  const actual = Object.keys(f).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...top].sort())) hold('fixture top-level schema drifted');
  const admissionKeys = [
    'tool','schema_marker','schema_version','max_bytes','operator_uid_required','mode_required',
    'nofollow_required','single_hardlink_required','generation_bound_read_required',
    'strict_utf8_required','closed_schema_required','security_bearing_allowed_values_bound',
    'admission_scope','secret_shape_scan_scope','secret_shape_rejection_required',
    'trusted_sanitization_required_before_injection','receipt_marker','receipt_contains_payload',
    'receipt_contains_local_path','receipt_binds_context_sha256','receipt_binds_parent_policy_sha256',
    'receipt_publication_anonymous_inode_required','receipt_publication_exact_parent_directory_handle_required',
    'receipt_publication_create_only_no_replace','receipt_final_single_hardlink_required',
    'receipt_parent_directory_handle_fsync_required','receipt_no_stage_path_alias',
    'receipt_retry_exact_existing_final_converges','receipt_conflicting_final_rejected',
    'verified_generation_consumed_as_returned_bytes','verify_cli_is_diagnostic_only',
    'sanitizer_policy_marker','sanitizer_policy_sha256','raw_verified_bytes_model_input_authority',
    'sanitized_projection_model_input_authority','safe_projection_excludes_free_form_values',
    'context_injection_requires_exact_receipt','admission_receipt_is_injection_authority',
    'live_runner_receipt_enforcement_claimed_active','live_runner_sanitized_projection_enforcement_claimed_active',
  ];
  if (JSON.stringify(Object.keys(f.context_admission).sort()) !== JSON.stringify(admissionKeys.sort())) {
    hold('context admission schema drifted');
  }
}

function assertWorkflowSelfEnforcement(workflow) {
  for (const required of [
    'scripts/void_brood_queen_local_context_admission_v1.mjs',
    'scripts/prove_void_brood_queen_local_model_seat_v1.mjs',
    'scripts/ci_diff_hygiene_v1.sh',
    'scripts/prove_ci_diff_hygiene_v1.mjs',
    'node scripts/prove_ci_diff_hygiene_v1.mjs',
    'bash scripts/ci_diff_hygiene_v1.sh',
    'CI_DIFF_CURRENT_SHA:',
    'CI_DIFF_CHECKOUT_SHA:',
    'github.event.pull_request.head.sha || github.sha',
  ]) {
    if (!workflow.includes(required)) hold(`workflow missing self-enforcement binding: ${required}`);
  }
}

async function main() {
  const [doc, fixtureText, workflow, parentText, commandText] = await Promise.all([
    readFile(DOC, 'utf8'), readFile(FIXTURE, 'utf8'), readFile(WORKFLOW, 'utf8'),
    readFile(PARENT, 'utf8'), readFile(COMMAND, 'utf8'),
  ]);
  const fixture = JSON.parse(fixtureText);
  const parent = JSON.parse(parentText);
  const command = JSON.parse(commandText);
  assertFixtureShape(fixture);
  assertWorkflowSelfEnforcement(workflow);

  requireExact(fixture.marker, MARKER, 'seat marker');
  requireExact(fixture.parent_identity_contract_marker, PARENT_MARKER, 'parent identity marker');
  requireExact(fixture.parent_command_layer_marker, COMMAND_MARKER, 'parent command marker');
  requireExact(parent.marker, PARENT_MARKER, 'parent identity fixture marker');
  requireExact(command.marker, COMMAND_MARKER, 'command fixture marker');

  const b = fixture.parent_binding;
  requireExact(b.domain, PARENT_DOMAIN, 'parent domain');
  requireExact(b.identity_reviewed_head, IDENTITY_HEAD, 'identity reviewed head');
  requireExact(b.identity_fixture_blob_sha, IDENTITY_FIXTURE_BLOB, 'identity fixture blob declaration');
  requireExact(b.identity_doc_blob_sha, IDENTITY_DOC_BLOB, 'identity doc blob declaration');
  requireExact(b.command_fixture_blob_sha, COMMAND_FIXTURE_BLOB, 'command fixture blob declaration');
  requireExact(b.command_doc_blob_sha, COMMAND_DOC_BLOB, 'command doc blob declaration');
  requireExact(gitBlob(PARENT), IDENTITY_FIXTURE_BLOB, 'identity fixture exact content');
  requireExact(gitBlob(PARENT_DOC), IDENTITY_DOC_BLOB, 'identity doc exact content');
  requireExact(gitBlob(COMMAND), COMMAND_FIXTURE_BLOB, 'command fixture exact content');
  requireExact(gitBlob(COMMAND_DOC), COMMAND_DOC_BLOB, 'command doc exact content');
  const preimage = `${PARENT_DOMAIN}\nidentity_commit=${IDENTITY_HEAD}\nidentity_fixture_blob=${IDENTITY_FIXTURE_BLOB}\nidentity_doc_blob=${IDENTITY_DOC_BLOB}\ncommand_fixture_blob=${COMMAND_FIXTURE_BLOB}\ncommand_doc_blob=${COMMAND_DOC_BLOB}\n`;
  requireExact(sha256(preimage), PARENT_POLICY_SHA256, 'parent policy preimage');
  requireExact(b.parent_policy_sha256, PARENT_POLICY_SHA256, 'parent policy fixture');
  requireTrue(b.same_marker_parent_content_drift_fails_closed, 'parent same-marker drift wall');
  if (spawnSync('git', ['merge-base', '--is-ancestor', IDENTITY_HEAD, 'HEAD']).status !== 0) {
    hold('reviewed identity head is not ancestor');
  }

  const identityProof = runNode(PARENT_PROOF);
  if (!identityProof.stdout.includes('VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_PROOF_GREEN')) {
    hold('parent identity proof not green');
  }
  const commandProof = runNode(COMMAND_PROOF);
  if (!commandProof.stdout.includes('void_crown_brood_queen_command_layer_v1_proof=GREEN')) {
    hold('parent command proof not green');
  }

  requireFalse(parent.root_identity.private_key_accessible_to_apollyon, 'parent Apollyon key access');
  requireFalse(parent.root_identity.private_key_enters_model_context, 'parent key model context');
  requireFalse(parent.authority_boundary.grants_validator_mutation, 'parent validator mutation');
  requireFalse(command.brood_queen.independent_signer_or_wallet_authority, 'command Brood Queen signer');
  requireFalse(command.general.title_grants_validator_mutation, 'command General validator mutation');

  const a = fixture.context_admission;
  requireExact(a.tool, CONTEXT_TOOL, 'admission tool');
  requireExact(a.schema_marker, CONTEXT_MARKER, 'context marker');
  requireExact(a.schema_version, CONTEXT_VERSION, 'context version');
  requireExact(a.max_bytes, MAX_CONTEXT_BYTES, 'context max bytes');
  for (const key of [
    'operator_uid_required','nofollow_required','single_hardlink_required','generation_bound_read_required',
    'strict_utf8_required','closed_schema_required','security_bearing_allowed_values_bound',
    'secret_shape_rejection_required','trusted_sanitization_required_before_injection',
    'receipt_binds_context_sha256','receipt_binds_parent_policy_sha256',
    'receipt_publication_anonymous_inode_required','receipt_publication_exact_parent_directory_handle_required',
    'receipt_publication_create_only_no_replace','receipt_final_single_hardlink_required',
    'receipt_parent_directory_handle_fsync_required','receipt_no_stage_path_alias',
    'receipt_retry_exact_existing_final_converges','receipt_conflicting_final_rejected',
    'verified_generation_consumed_as_returned_bytes','verify_cli_is_diagnostic_only',
    'sanitized_projection_model_input_authority','safe_projection_excludes_free_form_values',
    'context_injection_requires_exact_receipt',
  ]) requireTrue(a[key], `context_admission.${key}`);
  requireFalse(a.raw_verified_bytes_model_input_authority, 'raw verified model input authority');
  requireFalse(a.admission_receipt_is_injection_authority, 'receipt injection authority');
  requireFalse(a.live_runner_receipt_enforcement_claimed_active, 'live receipt enforcement claim');
  requireFalse(a.live_runner_sanitized_projection_enforcement_claimed_active, 'live sanitizer enforcement claim');
  requireExact(a.admission_scope, ADMISSION_SCOPE, 'admission scope');
  requireExact(a.secret_shape_scan_scope, SECRET_SHAPE_SCAN_SCOPE, 'secret scan scope');
  requireExact(a.receipt_marker, RECEIPT_MARKER, 'receipt marker');
  requireExact(a.sanitizer_policy_marker, SANITIZER_POLICY_MARKER, 'sanitizer marker');
  requireExact(a.sanitizer_policy_sha256, SANITIZER_POLICY_SHA256, 'sanitizer policy sha');
  requireTrue(TRUSTED_SANITIZATION_REQUIRED, 'source sanitizer requirement');
  requireFalse(ADMISSION_RECEIPT_IS_INJECTION_AUTHORITY, 'source receipt injection authority');

  const dir = await mkdtemp(join(tmpdir(), 'void-bq-context-v2-'));
  try {
    const contextPath = join(dir, 'context.json');
    const receiptPath = join(dir, 'receipt.json');
    await writePack(contextPath, SYNTHETIC_PACK);
    const originalBytes = await readFile(contextPath);

    const receipt = await admitContext(contextPath, receiptPath);
    requireExact(receipt.context_sha256, sha256(originalBytes), 'receipt context digest');
    requireFalse(receipt.admission_receipt_is_injection_authority, 'receipt authority');
    const receiptStat = await stat(receiptPath);
    if ((receiptStat.mode & 0o777) !== 0o600 || receiptStat.nlink !== 1) hold('receipt final mode/link count drifted');
    const names = await readdir(dir);
    if (names.some((name) => name.includes('.stage-'))) hold('stage pathname alias exists');

    const verified = await verifyContextReceipt(contextPath, receiptPath);
    if (!verified.contextBytes.equals(originalBytes)) hold('verified bytes drifted');
    requireFalse(verified.injection_authority, 'raw verified injection authority');
    await expectReject(Promise.resolve().then(() => authorizeModelInput(verified)), 'raw verified bytes model input');

    const sanitized = sanitizeVerifiedContext(verified);
    requireTrue(sanitized.model_input_authority, 'sanitized model input authority');
    requireExact(sanitized.source_context_sha256, sha256(originalBytes), 'sanitized source digest');
    const modelInput = authorizeModelInput(sanitized);
    if (!modelInput.equals(sanitized.modelInputBytes)) hold('authorized model input bytes drifted');
    const modelText = modelInput.toString('utf8');
    if (modelText.includes('synthetic_public_proof') || modelText.includes('useful_roles') || modelText.includes('lessons')) {
      hold('safe projection leaked free-form context');
    }

    const opaquePack = structuredClone(SYNTHETIC_PACK);
    opaquePack.source = 'opaque-synthetic-unrecognized-credential-shape-9876543210';
    const opaquePath = join(dir, 'opaque.json');
    const opaqueReceiptPath = join(dir, 'opaque.receipt.json');
    await writePack(opaquePath, opaquePack);
    await admitContext(opaquePath, opaqueReceiptPath);
    const opaqueVerified = await verifyContextReceipt(opaquePath, opaqueReceiptPath);
    const opaqueSanitized = sanitizeVerifiedContext(opaqueVerified);
    if (authorizeModelInput(opaqueSanitized).toString('utf8').includes(opaquePack.source)) {
      hold('opaque free-form value crossed sanitizer projection');
    }

    for (const point of ['after_tmp_create','after_tmp_write','after_tmp_sync','after_final_link']) {
      const rp = join(dir, `fault-${point}.receipt.json`);
      await expectReject(admitContext(contextPath, rp, { faultPoint: point }), `fault ${point}`);
      const recovered = await admitContext(contextPath, rp);
      requireExact(recovered.context_sha256, receipt.context_sha256, `retry ${point}`);
      const rs = await stat(rp);
      if (rs.nlink !== 1) hold(`retry receipt hard-link count drifted ${point}`);
      await verifyContextReceipt(contextPath, rp);
    }

    const conflictPath = join(dir, 'conflict.receipt.json');
    const conflictBytes = Buffer.from('{"foreign":true}\n');
    await writeFile(conflictPath, conflictBytes, { mode: 0o600 });
    await chmod(conflictPath, 0o600);
    await expectReject(admitContext(contextPath, conflictPath), 'conflicting final');
    if (!(await readFile(conflictPath)).equals(conflictBytes)) hold('conflicting final mutated');

    const swapRoot = join(dir, 'parent-swap');
    await mkdir(swapRoot, { mode: 0o700 });
    const swapContext = join(swapRoot, 'context.json');
    const swapReceipt = join(swapRoot, 'receipt.json');
    await writePack(swapContext, SYNTHETIC_PACK);
    await expectReject(admitContext(swapContext, swapReceipt, { faultPoint: 'swap_parent_path_after_link' }), 'parent directory generation swap');
    const swappedOld = `${swapRoot}.swapped`;
    const currentNames = await readdir(swapRoot);
    if (currentNames.includes('receipt.json')) hold('foreign replacement parent received authoritative receipt');
    const oldNames = await readdir(swappedOld);
    if (!oldNames.includes('receipt.json')) hold('exact original directory receipt witness missing after swap');
    await rm(swapRoot, { recursive: true, force: true });
    await rm(swappedOld, { recursive: true, force: true });

    const racePath = join(dir, 'race.json');
    const raceMoved = join(dir, 'race-old.json');
    const raceReceipt = join(dir, 'race.receipt.json');
    await writePack(racePath, SYNTHETIC_PACK);
    const raceOriginal = await readFile(racePath);
    await admitContext(racePath, raceReceipt);
    const replacementPack = structuredClone(SYNTHETIC_PACK);
    replacementPack.current_source_checkpoint.main_sha = 'f'.repeat(40);
    const replacementBytes = Buffer.from(`${JSON.stringify(replacementPack, null, 2)}\n`);
    const raceVerified = await verifyContextReceipt(racePath, raceReceipt, {
      afterContextReadHook: async () => {
        await rename(racePath, raceMoved);
        await writeFile(racePath, replacementBytes, { mode: 0o600 });
        await chmod(racePath, 0o600);
      },
    });
    if (!raceVerified.contextBytes.equals(raceOriginal)) hold('verify/use race lost original bytes');
    const raceSanitized = sanitizeVerifiedContext(raceVerified);
    requireExact(raceSanitized.source_context_sha256, sha256(raceOriginal), 'race sanitized source');
    if (authorizeModelInput(raceSanitized).includes(replacementBytes)) hold('replacement bytes became model input');

    const tampered = { ...raceSanitized, source_context_sha256: '0'.repeat(64) };
    await expectReject(Promise.resolve().then(() => authorizeModelInput(tampered)), 'sanitized capability source replay');

    const hardSource = join(dir, 'hard-source.json');
    const hardAlias = join(dir, 'hard-alias.json');
    await writePack(hardSource, SYNTHETIC_PACK);
    await link(hardSource, hardAlias);
    await expectReject(admitContext(hardSource, join(dir, 'hard.receipt.json')), 'context hard-link alias');

    const symlinkPath = join(dir, 'context-link.json');
    await symlink(contextPath, symlinkPath);
    await expectReject(admitContext(symlinkPath, join(dir, 'symlink.receipt.json')), 'context symlink');

    const growthPath = join(dir, 'growth.json');
    await writePack(growthPath, SYNTHETIC_PACK);
    const growth = await openPinnedPrivateContext(growthPath);
    await appendFile(growthPath, 'x'.repeat(MAX_CONTEXT_BYTES));
    try {
      await expectReject(readPinnedPrivateContextBytes(growth.fh, growth.preStamp), 'same-inode growth');
    } finally {
      await growth.fh.close();
    }

    const postCommitPath = join(dir, 'post-commit.receipt.json');
    const postCommit = await admitContext(contextPath, postCommitPath, {
      afterCommitHook: async () => { throw new Error('synthetic-post-commit-observer-failure'); },
    });
    requireExact(postCommit.context_sha256, receipt.context_sha256, 'post-commit convergence');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  for (const required of [
    MARKER, PARENT_MARKER, COMMAND_MARKER, IDENTITY_HEAD, PARENT_POLICY_SHA256,
    '**King → Brood Queen / Ren → General / Apollyon**',
    'anonymous inode', 'exact parent-directory handle', 'single hard link',
    'safe projection', 'raw verified bytes', 'does not claim that the live local runner already enforces',
    SANITIZER_POLICY_MARKER, SANITIZER_POLICY_SHA256, CANDIDATE_DIGEST, COMMAND_LAYER_SHA256,
  ]) {
    if (!doc.includes(required)) hold(`doc missing binding: ${required}`);
  }

  process.stdout.write('VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_PROOF_GREEN\n');
  process.stdout.write('parent_contract_content_bound=true\n');
  process.stdout.write('nested_machine_schema_closed=true\n');
  process.stdout.write('workflow_committed_range_self_enforced=true\n');
  process.stdout.write('receipt_anonymous_inode_publication=true\n');
  process.stdout.write('receipt_exact_parent_directory_handle=true\n');
  process.stdout.write('receipt_final_single_hardlink=true\n');
  process.stdout.write('receipt_no_stage_path_alias=true\n');
  process.stdout.write('sanitizer_to_model_input_gate_executable=true\n');
  process.stdout.write('raw_verified_bytes_model_input_authority=false\n');
  process.stdout.write('sanitized_projection_model_input_authority=true\n');
  process.stdout.write('live_runner_sanitized_projection_enforcement_claimed_active=false\n');
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
