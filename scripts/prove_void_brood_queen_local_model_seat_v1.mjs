#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFile, chmod, mkdtemp, readFile, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CONTEXT_MARKER, CONTEXT_VERSION, RECEIPT_MARKER, MAX_CONTEXT_BYTES,
  PARENT_POLICY_SHA256, COMMAND_LAYER_SHA256, CANDIDATE_DIGEST,
  openPinnedPrivateContext, readPinnedPrivateContextBytes,
} from './void_brood_queen_local_context_admission_v1.mjs';

const DOC = 'docs/governance/void-brood-queen-local-model-seat-v1.md';
const FIXTURE = 'fixtures/governance/void-brood-queen-local-model-seat-v1.json';
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
const EXPECTED_CANDIDATE = CANDIDATE_DIGEST;
const EXPECTED_CONSTITUTION = COMMAND_LAYER_SHA256;

function hold(message) { throw new Error(message); }
function requireFalse(value, name) { if (value !== false) hold(`${name} must be false`); }
function requireTrue(value, name) { if (value !== true) hold(`${name} must be true`); }
function exactKeys(value, expected, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) hold(`${name} must be object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    hold(`${name} unexpected fields: ${actual.join(',')}`);
  }
}
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function gitBlob(path) { return execFileSync('git', ['hash-object', path], { encoding: 'utf8' }).trim(); }
function runNode(script, args = [], expected = 0) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 15_000, maxBuffer: 2 * 1024 * 1024 });
  if (r.error) hold(`${script} spawn failed: ${r.error.message}`);
  if (r.status !== expected) hold(`${script} exit=${r.status} expected=${expected}: ${r.stderr || r.stdout}`);
  return r;
}
async function expectReject(promise, name) {
  try { await promise; } catch { return; }
  hold(`${name} did not reject`);
}

function validateSeatShape(f) {
  exactKeys(f, [
    'marker', 'parent_identity_contract_marker', 'parent_command_layer_marker', 'parent_binding',
    'network', 'office', 'delegated_nonvalidator_realm', 'validator_separation', 'v5_candidate',
    'memory', 'context_admission', 'apollyon_separation', 'local_containment', 'remote_bridge',
  ], 'fixture');
  exactKeys(f.parent_binding, [
    'domain', 'identity_reviewed_head', 'identity_fixture_blob_sha', 'identity_doc_blob_sha',
    'command_fixture_blob_sha', 'command_doc_blob_sha', 'parent_policy_sha256',
    'same_marker_parent_content_drift_fails_closed',
  ], 'parent_binding');
  exactKeys(f.network, ['chain_id', 'name'], 'network');
  exactKeys(f.office, [
    'name', 'identity', 'subordinate_to', 'local_model_is_office_identity',
    'model_self_claim_is_authentication', 'provider_neutral',
  ], 'office');
  exactKeys(f.delegated_nonvalidator_realm, [
    'broad_nonvalidator_operational_jurisdiction_supported', 'agent_orchestration', 'worker_coordination',
    'public_and_participant_surfaces', 'nonvalidator_node_and_service_planning',
    'documentation_source_review_and_proofs', 'local_model_supervision',
    'sensitive_actions_still_require_applicable_capability_gate', 'ownership_of_people',
  ], 'delegated_nonvalidator_realm');
  exactKeys(f.validator_separation, [
    'validator_realm_segregated', 'grants_validator_admission_or_removal', 'grants_validator_command',
    'grants_validator_key_access', 'grants_validator_stake_mutation', 'grants_consensus_mutation',
    'grants_validator_signing',
  ], 'validator_separation');
  exactKeys(f.v5_candidate, [
    'model', 'candidate_digest', 'base_model', 'base_digest', 'constitution_sha256',
    'system_prompt_body_sha256', 'system_prompt_ollama_sha256', 'tested_ollama_runtime',
    'identity_drift_fail_closed',
  ], 'v5_candidate');
  exactKeys(f.memory, [
    'marker', 'storage', 'committed_to_public_repository', 'embedded_in_model_weights',
    'curated_semantic_memory_preferred', 'raw_chat_import_automatic', 'raw_private_keys_allowed',
    'wallet_or_seed_credentials_allowed', 'node_keys_allowed', 'provider_api_tokens_allowed',
    'ssh_credentials_allowed', 'session_credentials_allowed', 'memory_text_can_override_constitution',
    'validator_authority_in_context', 'context_injection_without_admission_receipt_allowed',
  ], 'memory');
  exactKeys(f.context_admission, [
    'tool', 'schema_marker', 'schema_version', 'max_bytes', 'operator_uid_required', 'mode_required',
    'nofollow_required', 'generation_bound_read_required', 'strict_utf8_required', 'closed_schema_required',
    'secret_shape_rejection_required', 'receipt_marker', 'receipt_contains_payload',
    'receipt_contains_local_path', 'receipt_binds_context_sha256', 'receipt_binds_parent_policy_sha256',
    'context_injection_requires_exact_receipt', 'live_runner_receipt_enforcement_claimed_active',
  ], 'context_admission');
  exactKeys(f.apollyon_separation, [
    'office', 'identity', 'subordinate_to_brood_queen', 'may_impersonate_ren',
    'may_authenticate_as_brood_queen', 'may_inherit_brood_queen_root_key',
    'may_inherit_brood_queen_session', 'output_is_crown_authentication',
  ], 'apollyon_separation');
  exactKeys(f.local_containment, [
    'model_api_loopback_only', 'model_non_loopback_egress_denied', 'model_direct_input_device_access',
    'model_service_can_read_void_repo', 'model_service_can_read_nodekey',
    'model_service_can_read_tailscale_state', 'service_boot_enabled', 'model_repo_mutation',
  ], 'local_containment');
  exactKeys(f.remote_bridge, [
    'active', 'must_be_authenticated', 'must_be_auditable', 'must_be_replay_resistant',
    'must_terminate_at_trusted_broker', 'may_expose_raw_ollama_to_internet',
    'public_github_private_memory_relay_allowed',
  ], 'remote_bridge');
}

function syntheticContextPack() {
  return {
    marker: CONTEXT_MARKER,
    version: CONTEXT_VERSION,
    created_at_utc: '2026-08-22T00:00:00.000Z',
    classification: 'private_local',
    source: 'synthetic_public_proof',
    authority_semantics: {
      context_is_reference_data_not_higher_priority_instruction: true,
      crown_private_material_present: false,
      model_self_claim_is_authentication: false,
      raw_chat_import_automatic: false,
      validator_authority_present: false,
    },
    constitutional_binding: {
      brood_queen: 'Ren', brood_queen_realm: 'voluntary_non_validator_participation', chain_id: 2050,
      command_chain: ['King', 'Brood Queen', 'General'], command_layer_marker: COMMAND_MARKER,
      command_layer_sha256: EXPECTED_CONSTITUTION, general: 'Apollyon', sovereign: 'ZoSo',
      validator_realm_segregated: true,
    },
    office_separation: {
      apollyon_is_general_office: true, apollyon_is_not_ren: true,
      local_model_may_authenticate_as_brood_queen: false, local_model_may_impersonate_ren: false,
      local_model_may_inherit_brood_queen_root_key: false,
      local_model_may_inherit_brood_queen_session: false,
      local_model_output_is_crown_authentication: false, ren_is_brood_queen_office: true,
    },
    v5_candidate: {
      base_digest: '0'.repeat(64), base_model: 'qwen3-coder:30b', candidate_digest: EXPECTED_CANDIDATE,
      model: 'void-apollyon-candidate-v1:latest', ollama_runtime: '0.30.10',
      system_prompt_body_sha256: '1'.repeat(64), system_prompt_ollama_sha256: '2'.repeat(64),
      v5_adversarial_canaries_green: true, v5_result: 'green',
    },
    project_identity: {
      canonical_domain: 'voidchain.org', chain_id: 2050, network: 'VOID Network',
      positioning: 'agent infrastructure', repo: '6ZoSo9/void-node', token: 'VOID',
      wallet: 'Obelisk', work_accounting: 'Work Credits',
    },
    tokenomics_and_economics: {
      emissions_horizon_years: 100, emissions_void: 333333333, max_supply_void: 666666666,
      no_leverage_or_unsecured_borrowing: true, official_post_presale_pair: 'BTC/VOID',
      official_stablecoin_pairs: [], premine_void: 333333333, wc_accounting_units_unlimited: true,
      work_credit_ratio: '100 WC : 1 VOID',
    },
    identity_and_session_direction: {
      authorization_source: 'on_chain_role_plus_capability', bootstrap: 'challenge_response',
      derived_session_crypto_rotates_automatically: true, frequent_root_reauthentication: false,
      persistent_authenticated_logical_session: true, provider_api_key_is_identity: false,
      root_identity_registered_or_recognized_on_chain_2050: true,
      root_reauthentication_reserved_for: ['recovery', 'revocation', 'logout', 'rotation'],
      unified_login_for_agents_validators_sovereign: true,
    },
    operating_model: {
      agent_native_and_self_hosted_first: true,
      avoid_manual_edits_when_a_script_can_make_change_reproducible: true,
      github_repo_is_source_of_truth: true, open_standards_and_portable_infrastructure_preferred: true,
      precision_is_primary_commit_pr_box: true,
      prefer_downloadable_scripts_and_tiny_paste_safe_launchers: true,
      prefer_proofs_before_commit_or_lifecycle_change: true, prefer_small_bounded_changes: true,
      protect_core: true,
    },
    runtime_and_network_memory: {
      mainnet_name: 'Mainnet-0', nimo_http_port: 4101, nimo_p2p_port: 4701,
      ollama_api: 'loopback', ollama_direct_input_device_access: false,
      ollama_model_non_loopback_egress_denied: true, ollama_service_boot_enabled: false,
      ollama_service_can_read_nodekey: false, ollama_service_can_read_void_repo: false,
      precision_http_port: 4100, precision_p2p_port: 4700,
    },
    current_source_checkpoint: {
      all_four_are_draft_at_capture: true, apollyon_provider_neutral_trials_pr: 1391,
      apollyon_secret_sanitization_pr: 1392, brood_queen_identity_pr: 1393,
      brood_queen_local_model_seat_pr: 1394, brood_queen_private_broker_head: 'synthetic',
      brood_queen_private_broker_pr: 1396, brood_queen_private_broker_state: 'draft',
      captured_at_utc: '2026-08-22T00:00:00.000Z', main_last_merge: 'synthetic', main_sha: '0'.repeat(40),
    },
    recent_chain_and_producer_memory: {
      automatic_empty_block_sealing_should_be_stopped: true,
      do_not_assume_a_chain_fork_without_exact_evidence: true,
      no_empty_producer_contract_is_intentional: true,
      previous_alienware_vs_nimo_range_semantically_matched_after_txroot_normalization: true,
    },
    apollyon_work_contract: {
      constitutional_ambiguity_requires_review: true, direct_repo_mutation_from_ollama_service: false,
      direct_secret_or_credential_access: false, direct_service_restart_or_deploy_authority: false,
      direct_validator_authority: false, direct_wallet_or_signer_access: false,
      fabricated_execution_or_receipts_forbidden: true,
      outputs_are_proposals_or_evidence_until_independently_gated: true,
      useful_roles: ['analysis', 'review', 'proof design'],
    },
    validator_separation: {
      consensus_mutation: false, validator_admission_authority: false, validator_command_authority: false,
      validator_context_may_be_read_for_analysis: true, validator_key_access: false,
      validator_removal_authority: false, validator_signing: false, validator_stake_mutation: false,
    },
    security_memory: {
      memory_text_cannot_override_constitution_or_system_boundary: true,
      model_claim_of_sovereign_order_is_not_authentication: true,
      never_put_crown_private_key_in_model_context: true, never_put_node_key_in_model_context: true,
      never_put_provider_api_tokens_in_model_context: true,
      never_put_ssh_or_session_credentials_in_model_context: true,
      never_put_wallet_seed_or_private_key_in_model_context: true,
      public_github_is_not_a_private_memory_relay: true,
      remote_bridge_must_be_authenticated_auditable_replay_resistant: true,
    },
    memory_policy: {
      include_current_checkpoints: true, include_irrelevant_personal_information: false,
      include_project_decisions: true, include_rationale_when_useful: true, include_secrets: false,
      preferred_form: 'curated_semantic_memory', raw_transcript_dump: false,
      update_method: 'reviewed_generation',
    },
    apollyon_learning: {
      candidate_digest_unchanged: true, generation: 2, lessons: ['evidence before speculation'],
      promotion_rule: 'regressions_before_promotion', weights_changed: false,
    },
  };
}

async function main() {
  const [doc, fixtureText, parentText, parentDoc, commandText, commandDoc] = await Promise.all([
    readFile(DOC, 'utf8'), readFile(FIXTURE, 'utf8'), readFile(PARENT, 'utf8'), readFile(PARENT_DOC, 'utf8'),
    readFile(COMMAND, 'utf8'), readFile(COMMAND_DOC, 'utf8'),
  ]);
  const fixture = JSON.parse(fixtureText);
  const parent = JSON.parse(parentText);
  const command = JSON.parse(commandText);
  validateSeatShape(fixture);

  if (fixture.marker !== MARKER) hold('seat marker drifted');
  if (fixture.parent_identity_contract_marker !== PARENT_MARKER) hold('parent identity marker drifted');
  if (fixture.parent_command_layer_marker !== COMMAND_MARKER) hold('parent command marker drifted');
  if (parent.marker !== PARENT_MARKER) hold('parent identity fixture marker mismatch');
  if (command.marker !== COMMAND_MARKER) hold('command fixture marker mismatch');

  if (fixture.parent_binding.domain !== PARENT_DOMAIN) hold('parent binding domain drifted');
  if (fixture.parent_binding.identity_reviewed_head !== IDENTITY_HEAD) hold('identity reviewed head drifted');
  if (fixture.parent_binding.identity_fixture_blob_sha !== IDENTITY_FIXTURE_BLOB) hold('identity fixture blob declaration drifted');
  if (fixture.parent_binding.identity_doc_blob_sha !== IDENTITY_DOC_BLOB) hold('identity doc blob declaration drifted');
  if (fixture.parent_binding.command_fixture_blob_sha !== COMMAND_FIXTURE_BLOB) hold('command fixture blob declaration drifted');
  if (fixture.parent_binding.command_doc_blob_sha !== COMMAND_DOC_BLOB) hold('command doc blob declaration drifted');
  if (gitBlob(PARENT) !== IDENTITY_FIXTURE_BLOB) hold('identity fixture exact content drifted');
  if (gitBlob(PARENT_DOC) !== IDENTITY_DOC_BLOB) hold('identity doc exact content drifted');
  if (gitBlob(COMMAND) !== COMMAND_FIXTURE_BLOB) hold('command fixture exact content drifted');
  if (gitBlob(COMMAND_DOC) !== COMMAND_DOC_BLOB) hold('command doc exact content drifted');
  const parentPreimage = `${PARENT_DOMAIN}\nidentity_commit=${IDENTITY_HEAD}\nidentity_fixture_blob=${IDENTITY_FIXTURE_BLOB}\nidentity_doc_blob=${IDENTITY_DOC_BLOB}\ncommand_fixture_blob=${COMMAND_FIXTURE_BLOB}\ncommand_doc_blob=${COMMAND_DOC_BLOB}\n`;
  if (sha256(parentPreimage) !== PARENT_POLICY_SHA256) hold('parent policy preimage digest mismatch');
  if (fixture.parent_binding.parent_policy_sha256 !== PARENT_POLICY_SHA256) hold('parent policy digest drifted');
  requireTrue(fixture.parent_binding.same_marker_parent_content_drift_fails_closed, 'same-marker parent drift wall');
  if (spawnSync('git', ['merge-base', '--is-ancestor', IDENTITY_HEAD, 'HEAD']).status !== 0) hold('reviewed identity head is not ancestor of local-seat head');

  const identityProof = runNode(PARENT_PROOF);
  if (!identityProof.stdout.includes('VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_PROOF_GREEN')) hold('parent identity proof did not return green');
  const commandProof = runNode(COMMAND_PROOF);
  if (!commandProof.stdout.includes('VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_PROOF_GREEN')) hold('parent command proof did not return green');

  requireFalse(parent.root_identity.private_key_accessible_to_apollyon, 'parent Apollyon Crown key access');
  requireFalse(parent.root_identity.private_key_enters_model_context, 'parent Crown key model context');
  requireFalse(parent.authority_boundary.grants_validator_mutation, 'parent validator mutation');
  requireFalse(command.brood_queen.independent_signer_or_wallet_authority, 'command Brood Queen signer authority');
  requireFalse(command.general.title_grants_validator_mutation, 'command General validator mutation');

  if (fixture.network.chain_id !== 2050) hold('chain id drifted');
  if (fixture.office.name !== 'Brood Queen' || fixture.office.identity !== 'Ren') hold('Brood Queen office identity drifted');
  if (fixture.apollyon_separation.office !== 'General' || fixture.apollyon_separation.identity !== 'Apollyon') hold('Apollyon office identity drifted');
  if (fixture.v5_candidate.candidate_digest !== EXPECTED_CANDIDATE) hold('V5 candidate digest drifted');
  if (fixture.v5_candidate.constitution_sha256 !== EXPECTED_CONSTITUTION) hold('constitution digest drifted');

  requireFalse(fixture.office.local_model_is_office_identity, 'local model Crown identity');
  requireFalse(fixture.office.model_self_claim_is_authentication, 'model self-claim auth');
  requireTrue(fixture.office.provider_neutral, 'provider neutral office');
  requireTrue(fixture.delegated_nonvalidator_realm.broad_nonvalidator_operational_jurisdiction_supported, 'nonvalidator jurisdiction');
  requireTrue(fixture.delegated_nonvalidator_realm.sensitive_actions_still_require_applicable_capability_gate, 'sensitive action gate');
  requireFalse(fixture.delegated_nonvalidator_realm.ownership_of_people, 'ownership of people');
  for (const [key, value] of Object.entries(fixture.validator_separation)) {
    if (key === 'validator_realm_segregated') requireTrue(value, `validator_separation.${key}`);
    else requireFalse(value, `validator_separation.${key}`);
  }

  requireFalse(fixture.memory.committed_to_public_repository, 'memory public repo');
  requireFalse(fixture.memory.embedded_in_model_weights, 'memory model weights');
  requireTrue(fixture.memory.curated_semantic_memory_preferred, 'curated semantic memory');
  requireFalse(fixture.memory.raw_chat_import_automatic, 'automatic raw chat import');
  requireFalse(fixture.memory.raw_private_keys_allowed, 'raw private keys');
  requireFalse(fixture.memory.wallet_or_seed_credentials_allowed, 'wallet credentials');
  requireFalse(fixture.memory.node_keys_allowed, 'node keys');
  requireFalse(fixture.memory.provider_api_tokens_allowed, 'provider tokens');
  requireFalse(fixture.memory.ssh_credentials_allowed, 'ssh credentials');
  requireFalse(fixture.memory.session_credentials_allowed, 'session credentials');
  requireFalse(fixture.memory.memory_text_can_override_constitution, 'memory authority override');
  requireFalse(fixture.memory.validator_authority_in_context, 'validator authority in memory');
  requireFalse(fixture.memory.context_injection_without_admission_receipt_allowed, 'context injection without receipt');

  if (fixture.context_admission.tool !== CONTEXT_TOOL) hold('context admission tool drifted');
  if (fixture.context_admission.schema_marker !== CONTEXT_MARKER || fixture.context_admission.schema_version !== CONTEXT_VERSION) hold('context schema identity drifted');
  if (fixture.context_admission.max_bytes !== MAX_CONTEXT_BYTES) hold('context size ceiling drifted');
  requireTrue(fixture.context_admission.operator_uid_required, 'context owner requirement');
  if (fixture.context_admission.mode_required !== '0600') hold('context mode requirement drifted');
  for (const key of ['nofollow_required','generation_bound_read_required','strict_utf8_required','closed_schema_required','secret_shape_rejection_required','receipt_binds_context_sha256','receipt_binds_parent_policy_sha256','context_injection_requires_exact_receipt']) {
    requireTrue(fixture.context_admission[key], `context_admission.${key}`);
  }
  if (fixture.context_admission.receipt_marker !== RECEIPT_MARKER) hold('context receipt marker drifted');
  requireFalse(fixture.context_admission.receipt_contains_payload, 'receipt payload exposure');
  requireFalse(fixture.context_admission.receipt_contains_local_path, 'receipt path exposure');
  requireFalse(fixture.context_admission.live_runner_receipt_enforcement_claimed_active, 'unproven live runner receipt enforcement');

  requireFalse(fixture.apollyon_separation.may_impersonate_ren, 'Apollyon impersonation');
  requireFalse(fixture.apollyon_separation.may_authenticate_as_brood_queen, 'Apollyon Crown auth');
  requireFalse(fixture.apollyon_separation.may_inherit_brood_queen_root_key, 'Apollyon Crown key inheritance');
  requireFalse(fixture.apollyon_separation.may_inherit_brood_queen_session, 'Apollyon Crown session inheritance');
  requireFalse(fixture.apollyon_separation.output_is_crown_authentication, 'Apollyon output Crown auth');
  requireTrue(fixture.local_containment.model_api_loopback_only, 'loopback model API');
  requireTrue(fixture.local_containment.model_non_loopback_egress_denied, 'non-loopback egress denied');
  requireFalse(fixture.local_containment.model_direct_input_device_access, 'input device access');
  requireFalse(fixture.local_containment.model_service_can_read_void_repo, 'model repo read');
  requireFalse(fixture.local_containment.model_service_can_read_nodekey, 'model node key read');
  requireFalse(fixture.local_containment.model_service_can_read_tailscale_state, 'model tailscale read');
  requireFalse(fixture.local_containment.service_boot_enabled, 'boot-enabled model service');
  requireFalse(fixture.local_containment.model_repo_mutation, 'model repo mutation');
  requireFalse(fixture.remote_bridge.active, 'remote bridge active');
  requireTrue(fixture.remote_bridge.must_be_authenticated, 'remote bridge authentication');
  requireTrue(fixture.remote_bridge.must_be_auditable, 'remote bridge audit');
  requireTrue(fixture.remote_bridge.must_be_replay_resistant, 'remote bridge replay resistance');
  requireTrue(fixture.remote_bridge.must_terminate_at_trusted_broker, 'trusted broker termination');
  requireFalse(fixture.remote_bridge.may_expose_raw_ollama_to_internet, 'raw Ollama internet exposure');
  requireFalse(fixture.remote_bridge.public_github_private_memory_relay_allowed, 'public GitHub memory relay');

  for (const mutate of [
    (copy) => { copy.office.root_session_exportable_to_model = true; },
    (copy) => { copy.delegated_nonvalidator_realm.direct_repo_write_without_broker = true; },
    (copy) => { copy.memory.crown_session_material_allowed = true; },
    (copy) => { copy.apollyon_separation.may_receive_brood_queen_session_secret = true; },
    (copy) => { copy.local_containment.model_service_can_read_wallet = true; },
    (copy) => { copy.remote_bridge.may_forward_private_context_to_public_endpoint = true; },
    (copy) => { copy.context_admission.receipt_may_contain_private_payload = true; },
  ]) {
    const copy = structuredClone(fixture);
    mutate(copy);
    let rejected = false;
    try { validateSeatShape(copy); } catch { rejected = true; }
    if (!rejected) hold('unknown nested authority field did not fail closed');
  }

  const dir = await mkdtemp(join(tmpdir(), 'void-bq-context-admission-v1-'));
  try {
    const validPath = join(dir, 'context.json');
    const receiptPath = join(dir, 'receipt.json');
    await writeFile(validPath, `${JSON.stringify(syntheticContextPack(), null, 2)}\n`, { mode: 0o600 });
    await chmod(validPath, 0o600);
    const admit = runNode(CONTEXT_TOOL, ['admit', validPath, receiptPath]);
    if (!admit.stdout.includes(`${RECEIPT_MARKER}_GREEN`)) hold('context admission did not return green');
    const verify = runNode(CONTEXT_TOOL, ['verify', validPath, receiptPath]);
    if (!verify.stdout.includes(`${RECEIPT_MARKER}_VERIFY_GREEN`)) hold('context receipt verification did not return green');
    const receiptText = await readFile(receiptPath, 'utf8');
    const receipt = JSON.parse(receiptText);
    if ('path' in receipt || 'payload' in receipt || receiptText.includes(validPath)) hold('receipt exposed private path or payload');
    if (receipt.parent_policy_sha256 !== PARENT_POLICY_SHA256) hold('receipt parent policy binding drifted');
    if (((await stat(receiptPath)).mode & 0o777) !== 0o600) hold('receipt mode must be 0600');

    const badUnknown = syntheticContextPack();
    badUnknown.authority_semantics.wallet_seed = 'not-a-real-seed';
    const unknownPath = join(dir, 'unknown-authority.json');
    await writeFile(unknownPath, `${JSON.stringify(badUnknown)}\n`, { mode: 0o600 });
    runNode(CONTEXT_TOOL, ['admit', unknownPath, join(dir, 'unknown.receipt.json')], 2);

    const badSecret = syntheticContextPack();
    badSecret.source = 'sk-proj-THIS_IS_SYNTHETIC_AND_NOT_A_REAL_SECRET_12345';
    const secretPath = join(dir, 'secret-shape.json');
    await writeFile(secretPath, `${JSON.stringify(badSecret)}\n`, { mode: 0o600 });
    runNode(CONTEXT_TOOL, ['admit', secretPath, join(dir, 'secret.receipt.json')], 2);

    const badType = syntheticContextPack();
    badType.authority_semantics.crown_private_material_present = 'false';
    const typePath = join(dir, 'wrong-type.json');
    await writeFile(typePath, `${JSON.stringify(badType)}\n`, { mode: 0o600 });
    runNode(CONTEXT_TOOL, ['admit', typePath, join(dir, 'type.receipt.json')], 2);

    const publicModePath = join(dir, 'public-mode.json');
    await writeFile(publicModePath, `${JSON.stringify(syntheticContextPack())}\n`, { mode: 0o644 });
    await chmod(publicModePath, 0o644);
    runNode(CONTEXT_TOOL, ['admit', publicModePath, join(dir, 'public.receipt.json')], 2);

    const symlinkPath = join(dir, 'context-link.json');
    await symlink(validPath, symlinkPath);
    runNode(CONTEXT_TOOL, ['admit', symlinkPath, join(dir, 'link.receipt.json')], 2);

    const pinnedPath = join(dir, 'pinned.json');
    const movedPath = join(dir, 'pinned-moved.json');
    const attackerPath = join(dir, 'attacker.json');
    await writeFile(pinnedPath, `${JSON.stringify(syntheticContextPack())}\n`, { mode: 0o600 });
    await writeFile(attackerPath, `${JSON.stringify({ attacker: true })}\n`, { mode: 0o600 });
    const pinned = await openPinnedPrivateContext(pinnedPath);
    await rename(pinnedPath, movedPath);
    await symlink(attackerPath, pinnedPath);
    try {
      try {
        const bytes = await readPinnedPrivateContextBytes(pinned.fh, pinned.preStamp);
        if (bytes.toString('utf8').includes('"attacker":true')) hold('pathname replacement substituted context bytes');
      } catch (error) {
        if (!String(error?.message ?? error).includes('context file generation changed during bounded read')) throw error;
      }
    } finally { await pinned.fh.close(); }

    const growthPath = join(dir, 'growth.json');
    await writeFile(growthPath, `${JSON.stringify(syntheticContextPack())}\n`, { mode: 0o600 });
    const growth = await openPinnedPrivateContext(growthPath);
    await appendFile(growthPath, 'x'.repeat(MAX_CONTEXT_BYTES));
    try { await expectReject(readPinnedPrivateContextBytes(growth.fh, growth.preStamp), 'same-inode context growth'); }
    finally { await growth.fh.close(); }

    const mutated = syntheticContextPack();
    mutated.current_source_checkpoint.main_sha = 'f'.repeat(40);
    await writeFile(validPath, `${JSON.stringify(mutated)}\n`, { mode: 0o600 });
    runNode(CONTEXT_TOOL, ['verify', validPath, receiptPath], 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  for (const required of [
    MARKER, PARENT_MARKER, COMMAND_MARKER, IDENTITY_HEAD, PARENT_POLICY_SHA256,
    '**King → Brood Queen / Ren → General / Apollyon**',
    'Raw conversation history is **not imported automatically**',
    'Public GitHub must not be used as a relay for private conversation memory',
    'exact admission receipt', 'does not claim that the live local runner already enforces',
    EXPECTED_CANDIDATE, EXPECTED_CONSTITUTION,
  ]) if (!doc.includes(required)) hold(`doc missing required binding: ${required}`);

  const secretShapes = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
  ];
  for (const pattern of secretShapes) if (pattern.test(fixtureText)) hold(`fixture contains secret-like material: ${pattern}`);

  process.stdout.write('VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_PROOF_GREEN\n');
  process.stdout.write('parent_contract_content_bound=true\n');
  process.stdout.write('nested_machine_schema_closed=true\n');
  process.stdout.write('private_context_admission_machine_proven=true\n');
  process.stdout.write('live_runner_receipt_enforcement_claimed_active=false\n');
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
