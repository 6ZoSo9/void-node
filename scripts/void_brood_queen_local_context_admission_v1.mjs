#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { constants as FS } from 'node:fs';
import { open } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const CONTEXT_MARKER = 'VOID_BROOD_QUEEN_LOCAL_CONTEXT_PACK_V1';
export const CONTEXT_VERSION = '2.0.0';
export const RECEIPT_MARKER = 'VOID_BROOD_QUEEN_LOCAL_CONTEXT_ADMISSION_RECEIPT_V1';
export const SANITIZER_POLICY_MARKER = 'VOID_BROOD_QUEEN_LOCAL_CONTEXT_SAFE_PROJECTION_V1';
export const SANITIZER_POLICY_DESCRIPTOR = "VOID_BROOD_QUEEN_LOCAL_CONTEXT_SAFE_PROJECTION_V1|fields=constitutional_binding,identity_and_session_direction,runtime_and_network_memory,validator_separation,apollyon_work_contract,project_identity,operating_model|free_form=excluded|source_context_sha256=bound";
export const SANITIZER_POLICY_SHA256 = 'a001f87d9ab0baebd270d01600ba6f74f554839eeab9fbfa3a02f40d4f6238df';
export const MAX_CONTEXT_BYTES = 256 * 1024;
export const MAX_RECEIPT_BYTES = 4096;
export const PARENT_POLICY_SHA256 = '6fdac6f3851ea62fbfcc90f39568b881b8bc18a9469df0d702373039b4244155';
export const COMMAND_LAYER_MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
export const COMMAND_LAYER_SHA256 = 'f3b155ab9df462f7a4f0981a52aca15ec640548c19c7e81c24e883513112adbd';
export const CANDIDATE_DIGEST = 'ac1de81fc81bba23802b75e8d46beb1583785c14f94210af94e4e6901f93be3b';
export const CANDIDATE_MODEL = 'void-apollyon-candidate-v1:latest';
export const BASE_MODEL = 'qwen3-coder:30b';
export const BASE_DIGEST = '06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca';
export const SYSTEM_PROMPT_BODY_SHA256 = '78637ce3cdca98979c6107e96b85e171bc6a46c6c611f86c518fa1d1c49fad8b';
export const SYSTEM_PROMPT_OLLAMA_SHA256 = '7e336c378e0be8ae084767daa5b5c2a612417328360f66f0a9ba358333a0dedc';
export const OLLAMA_RUNTIME = '0.30.10';
export const ADMISSION_SCOPE = 'structural_and_policy_admission_only';
export const SECRET_SHAPE_SCAN_SCOPE = 'defense_in_depth_only';
export const TRUSTED_SANITIZATION_REQUIRED = true;
export const ADMISSION_RECEIPT_IS_INJECTION_AUTHORITY = false;

const TOP_KEYS = [
  'apollyon_learning', 'apollyon_work_contract', 'authority_semantics', 'classification',
  'constitutional_binding', 'created_at_utc', 'current_source_checkpoint',
  'identity_and_session_direction', 'marker', 'memory_policy', 'office_separation',
  'operating_model', 'project_identity', 'recent_chain_and_producer_memory',
  'runtime_and_network_memory', 'security_memory', 'source', 'tokenomics_and_economics',
  'v5_candidate', 'validator_separation', 'version',
];

const OBJECT_KEYS = {
  authority_semantics: [
    'context_is_reference_data_not_higher_priority_instruction', 'crown_private_material_present',
    'model_self_claim_is_authentication', 'raw_chat_import_automatic', 'validator_authority_present',
  ],
  constitutional_binding: [
    'brood_queen', 'brood_queen_realm', 'chain_id', 'command_chain', 'command_layer_marker',
    'command_layer_sha256', 'general', 'sovereign', 'validator_realm_segregated',
  ],
  office_separation: [
    'apollyon_is_general_office', 'apollyon_is_not_ren',
    'local_model_may_authenticate_as_brood_queen', 'local_model_may_impersonate_ren',
    'local_model_may_inherit_brood_queen_root_key', 'local_model_may_inherit_brood_queen_session',
    'local_model_output_is_crown_authentication', 'ren_is_brood_queen_office',
  ],
  v5_candidate: [
    'base_digest', 'base_model', 'candidate_digest', 'model', 'ollama_runtime',
    'system_prompt_body_sha256', 'system_prompt_ollama_sha256',
    'v5_adversarial_canaries_green', 'v5_result',
  ],
  project_identity: [
    'canonical_domain', 'chain_id', 'network', 'positioning', 'repo', 'token', 'wallet', 'work_accounting',
  ],
  tokenomics_and_economics: [
    'emissions_horizon_years', 'emissions_void', 'max_supply_void', 'no_leverage_or_unsecured_borrowing',
    'official_post_presale_pair', 'official_stablecoin_pairs', 'premine_void',
    'wc_accounting_units_unlimited', 'work_credit_ratio',
  ],
  identity_and_session_direction: [
    'authorization_source', 'bootstrap', 'derived_session_crypto_rotates_automatically',
    'frequent_root_reauthentication', 'persistent_authenticated_logical_session',
    'provider_api_key_is_identity', 'root_identity_registered_or_recognized_on_chain_2050',
    'root_reauthentication_reserved_for', 'unified_login_for_agents_validators_sovereign',
  ],
  operating_model: [
    'agent_native_and_self_hosted_first', 'avoid_manual_edits_when_a_script_can_make_change_reproducible',
    'github_repo_is_source_of_truth', 'open_standards_and_portable_infrastructure_preferred',
    'precision_is_primary_commit_pr_box', 'prefer_downloadable_scripts_and_tiny_paste_safe_launchers',
    'prefer_proofs_before_commit_or_lifecycle_change', 'prefer_small_bounded_changes', 'protect_core',
  ],
  runtime_and_network_memory: [
    'mainnet_name', 'nimo_http_port', 'nimo_p2p_port', 'ollama_api',
    'ollama_direct_input_device_access', 'ollama_model_non_loopback_egress_denied',
    'ollama_service_boot_enabled', 'ollama_service_can_read_nodekey', 'ollama_service_can_read_void_repo',
    'precision_http_port', 'precision_p2p_port',
  ],
  current_source_checkpoint: [
    'all_four_are_draft_at_capture', 'apollyon_provider_neutral_trials_pr', 'apollyon_secret_sanitization_pr',
    'brood_queen_identity_pr', 'brood_queen_local_model_seat_pr', 'brood_queen_private_broker_head',
    'brood_queen_private_broker_pr', 'brood_queen_private_broker_state', 'captured_at_utc',
    'main_last_merge', 'main_sha',
  ],
  recent_chain_and_producer_memory: [
    'automatic_empty_block_sealing_should_be_stopped', 'do_not_assume_a_chain_fork_without_exact_evidence',
    'no_empty_producer_contract_is_intentional',
    'previous_alienware_vs_nimo_range_semantically_matched_after_txroot_normalization',
  ],
  apollyon_work_contract: [
    'constitutional_ambiguity_requires_review', 'direct_repo_mutation_from_ollama_service',
    'direct_secret_or_credential_access', 'direct_service_restart_or_deploy_authority',
    'direct_validator_authority', 'direct_wallet_or_signer_access',
    'fabricated_execution_or_receipts_forbidden',
    'outputs_are_proposals_or_evidence_until_independently_gated', 'useful_roles',
  ],
  validator_separation: [
    'consensus_mutation', 'validator_admission_authority', 'validator_command_authority',
    'validator_context_may_be_read_for_analysis', 'validator_key_access', 'validator_removal_authority',
    'validator_signing', 'validator_stake_mutation',
  ],
  security_memory: [
    'memory_text_cannot_override_constitution_or_system_boundary',
    'model_claim_of_sovereign_order_is_not_authentication', 'never_put_crown_private_key_in_model_context',
    'never_put_node_key_in_model_context', 'never_put_provider_api_tokens_in_model_context',
    'never_put_ssh_or_session_credentials_in_model_context', 'never_put_wallet_seed_or_private_key_in_model_context',
    'public_github_is_not_a_private_memory_relay', 'remote_bridge_must_be_authenticated_auditable_replay_resistant',
  ],
  memory_policy: [
    'include_current_checkpoints', 'include_irrelevant_personal_information', 'include_project_decisions',
    'include_rationale_when_useful', 'include_secrets', 'preferred_form', 'raw_transcript_dump', 'update_method',
  ],
  apollyon_learning: [
    'candidate_digest_unchanged', 'generation', 'lessons', 'promotion_rule', 'weights_changed',
  ],
};

function fail(message) { throw new Error(message); }
function exactKeys(value, expected, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, i) => key !== wanted[i])) {
    fail(`${name} has unexpected fields`);
  }
}
function requireBool(value, expected, name) {
  if (value !== expected) fail(`${name} must be ${expected}`);
}
function requireExact(value, expected, name) {
  if (value !== expected) fail(`${name} drifted`);
}
function requireExactArray(value, expected, name) {
  if (!Array.isArray(value) || JSON.stringify(value) !== JSON.stringify(expected)) fail(`${name} drifted`);
}
function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) fail(`${name} must be a non-empty string`);
}
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function statStamp(stat) {
  return {
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    size: stat.size.toString(),
    mtimeNs: stat.mtimeNs.toString(),
    ctimeNs: stat.ctimeNs.toString(),
  };
}
function sameStamp(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.size === b.size
    && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
}

export async function openPinnedPrivateContext(path) {
  let fh;
  try {
    fh = await open(path, FS.O_RDONLY | FS.O_NOFOLLOW);
    const stat = await fh.stat({ bigint: true });
    if (!stat.isFile()) fail('context must be a regular file');
    if (stat.uid !== BigInt(process.getuid())) fail('context must be owned by current operator uid');
    if ((Number(stat.mode) & 0o777) !== 0o600) fail('context mode must be exactly 0600');
    if (stat.nlink !== 1n) fail('context must have exactly one hard link');
    if (stat.size < 1n || stat.size > BigInt(MAX_CONTEXT_BYTES)) {
      fail(`context size must be 1..${MAX_CONTEXT_BYTES} bytes`);
    }
    return { fh, preStamp: statStamp(stat) };
  } catch (error) {
    if (fh) await fh.close().catch(() => {});
    throw error;
  }
}

export async function readPinnedPrivateContextBytes(fh, preStamp) {
  const chunks = [];
  let total = 0;
  let position = 0;
  while (true) {
    const remaining = MAX_CONTEXT_BYTES + 1 - total;
    if (remaining <= 0) fail(`context exceeds ${MAX_CONTEXT_BYTES} bytes during read`);
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, remaining));
    const { bytesRead } = await fh.read(buffer, 0, buffer.length, position);
    if (bytesRead === 0) break;
    chunks.push(buffer.subarray(0, bytesRead));
    total += bytesRead;
    position += bytesRead;
    if (total > MAX_CONTEXT_BYTES) fail(`context exceeds ${MAX_CONTEXT_BYTES} bytes during read`);
  }
  const postStamp = statStamp(await fh.stat({ bigint: true }));
  if (!sameStamp(preStamp, postStamp)) fail('context file generation changed during bounded read');
  return Buffer.concat(chunks, total);
}

function scanKnownSecretShapes(value, path = '$') {
  if (typeof value === 'string') {
    const patterns = [
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
      /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
      /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
      /\bAKIA[0-9A-Z]{16}\b/,
      /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}\b/i,
    ];
    for (const pattern of patterns) {
      if (pattern.test(value)) fail(`known secret-like value rejected at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanKnownSecretShapes(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) scanKnownSecretShapes(child, `${path}.${key}`);
  }
}

function validateSecurityBearingSemantics(pack) {
  const c = pack.constitutional_binding;
  requireExact(c.chain_id, 2050, 'constitutional_binding.chain_id');
  requireExact(c.brood_queen, 'Ren', 'constitutional_binding.brood_queen');
  requireExact(c.brood_queen_realm, 'voluntary_non_validator_participation', 'constitutional_binding.brood_queen_realm');
  requireExact(c.general, 'Apollyon', 'constitutional_binding.general');
  requireExact(c.sovereign, 'ZoSo', 'constitutional_binding.sovereign');
  requireExactArray(c.command_chain, ['King', 'Brood Queen', 'General'], 'constitutional_binding.command_chain');
  requireExact(c.command_layer_marker, COMMAND_LAYER_MARKER, 'constitutional_binding.command_layer_marker');
  requireExact(c.command_layer_sha256, COMMAND_LAYER_SHA256, 'constitutional_binding.command_layer_sha256');
  requireBool(c.validator_realm_segregated, true, 'constitutional_binding.validator_realm_segregated');

  const v5 = pack.v5_candidate;
  requireExact(v5.model, CANDIDATE_MODEL, 'v5_candidate.model');
  requireExact(v5.candidate_digest, CANDIDATE_DIGEST, 'v5_candidate.candidate_digest');
  requireExact(v5.base_model, BASE_MODEL, 'v5_candidate.base_model');
  requireExact(v5.base_digest, BASE_DIGEST, 'v5_candidate.base_digest');
  requireExact(v5.system_prompt_body_sha256, SYSTEM_PROMPT_BODY_SHA256, 'v5_candidate.system_prompt_body_sha256');
  requireExact(v5.system_prompt_ollama_sha256, SYSTEM_PROMPT_OLLAMA_SHA256, 'v5_candidate.system_prompt_ollama_sha256');
  requireExact(v5.ollama_runtime, OLLAMA_RUNTIME, 'v5_candidate.ollama_runtime');
  requireBool(v5.v5_adversarial_canaries_green, true, 'v5_candidate.v5_adversarial_canaries_green');
  requireExact(v5.v5_result, 'green', 'v5_candidate.v5_result');

  const identity = pack.identity_and_session_direction;
  requireExact(identity.authorization_source, 'on_chain_role_plus_capability', 'identity_and_session_direction.authorization_source');
  requireExact(identity.bootstrap, 'challenge_response', 'identity_and_session_direction.bootstrap');
  requireBool(identity.derived_session_crypto_rotates_automatically, true, 'identity_and_session_direction.derived_session_crypto_rotates_automatically');
  requireBool(identity.frequent_root_reauthentication, false, 'identity_and_session_direction.frequent_root_reauthentication');
  requireBool(identity.persistent_authenticated_logical_session, true, 'identity_and_session_direction.persistent_authenticated_logical_session');
  requireBool(identity.provider_api_key_is_identity, false, 'identity_and_session_direction.provider_api_key_is_identity');
  requireBool(identity.root_identity_registered_or_recognized_on_chain_2050, true, 'identity_and_session_direction.root_identity_registered_or_recognized_on_chain_2050');
  requireBool(identity.unified_login_for_agents_validators_sovereign, true, 'identity_and_session_direction.unified_login_for_agents_validators_sovereign');

  const runtime = pack.runtime_and_network_memory;
  requireExact(runtime.ollama_api, 'loopback', 'runtime_and_network_memory.ollama_api');
  requireBool(runtime.ollama_direct_input_device_access, false, 'runtime_and_network_memory.ollama_direct_input_device_access');
  requireBool(runtime.ollama_model_non_loopback_egress_denied, true, 'runtime_and_network_memory.ollama_model_non_loopback_egress_denied');
  requireBool(runtime.ollama_service_boot_enabled, false, 'runtime_and_network_memory.ollama_service_boot_enabled');
  requireBool(runtime.ollama_service_can_read_nodekey, false, 'runtime_and_network_memory.ollama_service_can_read_nodekey');
  requireBool(runtime.ollama_service_can_read_void_repo, false, 'runtime_and_network_memory.ollama_service_can_read_void_repo');

  for (const [key, value] of Object.entries(pack.validator_separation)) {
    if (key === 'validator_context_may_be_read_for_analysis') requireBool(value, true, `validator_separation.${key}`);
    else requireBool(value, false, `validator_separation.${key}`);
  }

  const work = pack.apollyon_work_contract;
  for (const key of [
    'direct_repo_mutation_from_ollama_service', 'direct_secret_or_credential_access',
    'direct_service_restart_or_deploy_authority', 'direct_validator_authority', 'direct_wallet_or_signer_access',
  ]) requireBool(work[key], false, `apollyon_work_contract.${key}`);
  requireBool(work.constitutional_ambiguity_requires_review, true, 'apollyon_work_contract.constitutional_ambiguity_requires_review');
  requireBool(work.fabricated_execution_or_receipts_forbidden, true, 'apollyon_work_contract.fabricated_execution_or_receipts_forbidden');
  requireBool(work.outputs_are_proposals_or_evidence_until_independently_gated, true, 'apollyon_work_contract.outputs_are_proposals_or_evidence_until_independently_gated');

  const separation = pack.office_separation;
  requireBool(separation.apollyon_is_general_office, true, 'office_separation.apollyon_is_general_office');
  requireBool(separation.apollyon_is_not_ren, true, 'office_separation.apollyon_is_not_ren');
  requireBool(separation.local_model_may_authenticate_as_brood_queen, false, 'office_separation.local_model_may_authenticate_as_brood_queen');
  requireBool(separation.local_model_may_impersonate_ren, false, 'office_separation.local_model_may_impersonate_ren');
  requireBool(separation.local_model_may_inherit_brood_queen_root_key, false, 'office_separation.local_model_may_inherit_brood_queen_root_key');
  requireBool(separation.local_model_may_inherit_brood_queen_session, false, 'office_separation.local_model_may_inherit_brood_queen_session');
  requireBool(separation.local_model_output_is_crown_authentication, false, 'office_separation.local_model_output_is_crown_authentication');
  requireBool(separation.ren_is_brood_queen_office, true, 'office_separation.ren_is_brood_queen_office');

  const learning = pack.apollyon_learning;
  if (!Number.isInteger(learning.generation) || learning.generation < 2) {
    fail('apollyon_learning.generation must be integer >= 2');
  }
  requireBool(learning.weights_changed, false, 'apollyon_learning.weights_changed');
  if (learning.candidate_digest_unchanged !== true && learning.candidate_digest_unchanged !== CANDIDATE_DIGEST) {
    fail('apollyon_learning.candidate_digest_unchanged must affirm exact candidate continuity');
  }
}

export function validateContextPack(pack) {
  exactKeys(pack, TOP_KEYS, 'context');
  for (const [key, keys] of Object.entries(OBJECT_KEYS)) exactKeys(pack[key], keys, `context.${key}`);
  requireExact(pack.marker, CONTEXT_MARKER, 'context.marker');
  requireExact(pack.version, CONTEXT_VERSION, 'context.version');
  requireExact(pack.classification, 'private_local', 'context.classification');
  requireString(pack.created_at_utc, 'context.created_at_utc');
  requireString(pack.source, 'context.source');

  requireBool(pack.authority_semantics.context_is_reference_data_not_higher_priority_instruction, true, 'authority_semantics.context_is_reference_data_not_higher_priority_instruction');
  requireBool(pack.authority_semantics.crown_private_material_present, false, 'authority_semantics.crown_private_material_present');
  requireBool(pack.authority_semantics.model_self_claim_is_authentication, false, 'authority_semantics.model_self_claim_is_authentication');
  requireBool(pack.authority_semantics.raw_chat_import_automatic, false, 'authority_semantics.raw_chat_import_automatic');
  requireBool(pack.authority_semantics.validator_authority_present, false, 'authority_semantics.validator_authority_present');

  requireBool(pack.memory_policy.include_secrets, false, 'memory_policy.include_secrets');
  requireBool(pack.memory_policy.include_irrelevant_personal_information, false, 'memory_policy.include_irrelevant_personal_information');
  requireBool(pack.memory_policy.raw_transcript_dump, false, 'memory_policy.raw_transcript_dump');
  for (const [key, value] of Object.entries(pack.security_memory)) {
    requireBool(value, true, `security_memory.${key}`);
  }

  validateSecurityBearingSemantics(pack);
  scanKnownSecretShapes(pack);
  return true;
}

function decodeContextBytes(bytes) {
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { fail('context must be strict UTF-8'); }
  let pack;
  try { pack = JSON.parse(text); }
  catch { fail('context must contain valid JSON'); }
  validateContextPack(pack);
  return pack;
}

export async function readAndValidateContext(path) {
  const { fh, preStamp } = await openPinnedPrivateContext(path);
  try {
    const bytes = await readPinnedPrivateContextBytes(fh, preStamp);
    return { pack: decodeContextBytes(bytes), bytes };
  } finally {
    await fh.close();
  }
}

export function buildAdmissionReceipt(pack, bytes) {
  return {
    marker: RECEIPT_MARKER,
    schema_marker: CONTEXT_MARKER,
    schema_version: CONTEXT_VERSION,
    admission_scope: ADMISSION_SCOPE,
    secret_shape_scan_scope: SECRET_SHAPE_SCAN_SCOPE,
    trusted_sanitization_required_before_injection: true,
    admission_receipt_is_injection_authority: false,
    parent_policy_sha256: PARENT_POLICY_SHA256,
    context_sha256: sha256(bytes),
    byte_length: bytes.length,
    command_layer_sha256: pack.constitutional_binding.command_layer_sha256,
    candidate_digest: pack.v5_candidate.candidate_digest,
  };
}

function validateReceiptShape(receipt) {
  exactKeys(receipt, [
    'marker', 'schema_marker', 'schema_version', 'admission_scope', 'secret_shape_scan_scope',
    'trusted_sanitization_required_before_injection', 'admission_receipt_is_injection_authority',
    'parent_policy_sha256', 'context_sha256', 'byte_length', 'command_layer_sha256', 'candidate_digest',
  ], 'receipt');
  requireExact(receipt.marker, RECEIPT_MARKER, 'receipt.marker');
  requireExact(receipt.schema_marker, CONTEXT_MARKER, 'receipt.schema_marker');
  requireExact(receipt.schema_version, CONTEXT_VERSION, 'receipt.schema_version');
  requireExact(receipt.admission_scope, ADMISSION_SCOPE, 'receipt.admission_scope');
  requireExact(receipt.secret_shape_scan_scope, SECRET_SHAPE_SCAN_SCOPE, 'receipt.secret_shape_scan_scope');
  requireBool(receipt.trusted_sanitization_required_before_injection, true, 'receipt.trusted_sanitization_required_before_injection');
  requireBool(receipt.admission_receipt_is_injection_authority, false, 'receipt.admission_receipt_is_injection_authority');
  requireExact(receipt.parent_policy_sha256, PARENT_POLICY_SHA256, 'receipt.parent_policy_sha256');
  if (!/^[0-9a-f]{64}$/.test(receipt.context_sha256 ?? '')) fail('receipt context digest invalid');
  if (!Number.isInteger(receipt.byte_length) || receipt.byte_length < 1 || receipt.byte_length > MAX_CONTEXT_BYTES) {
    fail('receipt byte length invalid');
  }
  requireExact(receipt.command_layer_sha256, COMMAND_LAYER_SHA256, 'receipt.command_layer_sha256');
  requireExact(receipt.candidate_digest, CANDIDATE_DIGEST, 'receipt.candidate_digest');
}

function canonicalReceiptBytes(receipt) {
  validateReceiptShape(receipt);
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  if (bytes.length > MAX_RECEIPT_BYTES) fail('receipt is oversized');
  return bytes;
}

const PY_RECEIPT_PUBLISHER = String.raw`
import ctypes, errno, json, os, stat, sys

final_path = os.path.abspath(sys.argv[1])
fault = sys.argv[2] if len(sys.argv) > 2 else ""
expected = sys.stdin.buffer.read()
parent_path = os.path.dirname(final_path)
name = os.path.basename(final_path)
if not name or name in (".", "..") or "/" in name:
    raise SystemExit("bad final name")

def die(msg):
    print("HOLD:" + msg, file=sys.stderr)
    raise SystemExit(2)

pfd = os.open(parent_path, os.O_RDONLY | os.O_DIRECTORY)
try:
    parent_stat = os.fstat(pfd)

    def current_parent_matches():
        try:
            st = os.stat(parent_path)
        except FileNotFoundError:
            return False
        return st.st_dev == parent_stat.st_dev and st.st_ino == parent_stat.st_ino

    def read_final_exact():
        fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=pfd)
        try:
            st1 = os.fstat(fd)
            if not stat.S_ISREG(st1.st_mode):
                die("receipt final must be regular file")
            if st1.st_uid != os.getuid():
                die("receipt final wrong uid")
            if stat.S_IMODE(st1.st_mode) != 0o600:
                die("receipt final mode must be 0600")
            if st1.st_nlink != 1:
                die("receipt final must have exactly one hard link")
            data = bytearray()
            while True:
                chunk = os.read(fd, 65536)
                if not chunk:
                    break
                data += chunk
                if len(data) > 4096:
                    die("receipt final oversized")
            st2 = os.fstat(fd)
            if (st1.st_dev,st1.st_ino,st1.st_size,st1.st_mtime_ns,st1.st_ctime_ns) != (st2.st_dev,st2.st_ino,st2.st_size,st2.st_mtime_ns,st2.st_ctime_ns):
                die("receipt final generation changed during read")
            if bytes(data) != expected:
                die("receipt path occupied by conflicting generation")
            return st2
        finally:
            os.close(fd)

    try:
        existing = read_final_exact()
    except FileNotFoundError:
        existing = None

    if existing is not None:
        os.fsync(pfd)
        if not current_parent_matches():
            die("receipt parent directory generation changed")
        print(json.dumps({"existing_exact": True, "linked_new_final": False}))
        raise SystemExit(0)

    try:
        tfd = os.open(".", os.O_TMPFILE | os.O_RDWR, 0o600, dir_fd=pfd)
    except OSError as e:
        die("O_TMPFILE unavailable:" + str(e))
    try:
        if fault == "after_tmp_create":
            die("synthetic-after_tmp_create")
        offset = 0
        while offset < len(expected):
            n = os.write(tfd, expected[offset:])
            if n <= 0:
                die("short receipt write")
            offset += n
        if fault == "after_tmp_write":
            die("synthetic-after_tmp_write")
        os.fsync(tfd)
        if fault == "after_tmp_sync":
            die("synthetic-after_tmp_sync")

        tst = os.fstat(tfd)
        libc = ctypes.CDLL(None, use_errno=True)
        rc = libc.linkat(tfd, ctypes.c_char_p(b""), pfd, ctypes.c_char_p(os.fsencode(name)), 0x1000)
        if rc != 0:
            err = ctypes.get_errno()
            if err != errno.EEXIST:
                die("linkat failed:" + os.strerror(err))
            read_final_exact()
            linked = False
        else:
            linked = True
            fst = read_final_exact()
            if fst.st_dev != tst.st_dev or fst.st_ino != tst.st_ino:
                die("final receipt inode is not exact anonymous staged generation")
            if fst.st_nlink != 1:
                die("final receipt must have exactly one hard link")
        if fault == "after_final_link":
            die("synthetic-after_final_link")
        if fault == "swap_parent_path_after_link":
            moved = parent_path + ".swapped"
            os.rename(parent_path, moved)
            os.mkdir(parent_path, 0o700)

        os.fsync(pfd)
        if not current_parent_matches():
            die("receipt parent directory generation changed")
        committed = read_final_exact()
        if linked and (committed.st_dev != tst.st_dev or committed.st_ino != tst.st_ino):
            die("committed final receipt generation drifted")
        print(json.dumps({"existing_exact": not linked, "linked_new_final": linked}))
    finally:
        os.close(tfd)
finally:
    os.close(pfd)
`;

export async function publishAdmissionReceipt(path, receipt, options = {}) {
  const bytes = canonicalReceiptBytes(receipt);
  const faultPoint = options.faultPoint ?? '';
  const run = spawnSync('python3', ['-S', '-c', PY_RECEIPT_PUBLISHER, resolve(path), faultPoint], {
    input: bytes,
    encoding: 'utf8',
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
  if (run.error) fail(`receipt publisher spawn failed: ${run.error.message}`);
  if (run.status !== 0) fail((run.stderr || run.stdout || `receipt publisher exit=${run.status}`).trim());
  let result;
  try { result = JSON.parse(run.stdout.trim()); }
  catch { fail('receipt publisher returned invalid result'); }

  try {
    if (typeof options.afterCommitHook === 'function') {
      await options.afterCommitHook('after_parent_directory_sync', { receipt_path: path });
    }
  } catch {
    // A post-commit observer failure cannot downgrade the durable exact receipt.
  }
  return { receipt, ...result, stage_path_retained_for_recovery: null };
}

async function readAndValidateReceipt(path) {
  let fh;
  try {
    fh = await open(path, FS.O_RDONLY | FS.O_NOFOLLOW);
    const pre = await fh.stat({ bigint: true });
    if (!pre.isFile()) fail('receipt must be regular file');
    if (pre.uid !== BigInt(process.getuid())) fail('receipt must be owned by current operator uid');
    if ((Number(pre.mode) & 0o777) !== 0o600) fail('receipt mode must be exactly 0600');
    if (pre.nlink !== 1n) fail('receipt must have exactly one hard link');
    if (pre.size < 1n || pre.size > BigInt(MAX_RECEIPT_BYTES)) fail('receipt is oversized');
    const bytes = Buffer.alloc(Number(pre.size));
    const { bytesRead } = await fh.read(bytes, 0, bytes.length, 0);
    if (bytesRead !== bytes.length) fail('receipt short read');
    const post = await fh.stat({ bigint: true });
    if (!sameStamp(statStamp(pre), statStamp(post))) fail('receipt generation changed during bounded read');
    let receipt;
    try { receipt = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { fail('receipt must be strict UTF-8 JSON'); }
    validateReceiptShape(receipt);
    if (!canonicalReceiptBytes(receipt).equals(bytes)) fail('receipt bytes are not canonical');
    return { receipt, bytes };
  } finally {
    if (fh) await fh.close();
  }
}

export async function admitContext(contextPath, receiptPath, options = {}) {
  const { pack, bytes } = await readAndValidateContext(contextPath);
  const receipt = buildAdmissionReceipt(pack, bytes);
  await publishAdmissionReceipt(receiptPath, receipt, options);
  return receipt;
}

export async function verifyContextReceipt(contextPath, receiptPath, options = {}) {
  const { pack, bytes } = await readAndValidateContext(contextPath);
  if (typeof options.afterContextReadHook === 'function') {
    await options.afterContextReadHook('after_context_read', { context_sha256: sha256(bytes) });
  }
  const { receipt: receiptFile } = await readAndValidateReceipt(receiptPath);
  const expected = buildAdmissionReceipt(pack, bytes);
  if (JSON.stringify(receiptFile) !== JSON.stringify(expected)) {
    fail('receipt does not bind exact admitted context generation');
  }
  return {
    receipt: expected,
    contextBytes: Buffer.from(bytes),
    context_sha256: expected.context_sha256,
    admission_scope: ADMISSION_SCOPE,
    trusted_sanitization_required_before_injection: true,
    injection_authority: false,
  };
}

function safeProjectionFromPack(pack, sourceContextSha256) {
  return {
    marker: SANITIZER_POLICY_MARKER,
    sanitizer_policy_sha256: SANITIZER_POLICY_SHA256,
    source_context_sha256: sourceContextSha256,
    candidate_digest: CANDIDATE_DIGEST,
    command_layer_sha256: COMMAND_LAYER_SHA256,
    constitutional_binding: {
      chain_id: 2050,
      sovereign: 'ZoSo',
      brood_queen: 'Ren',
      general: 'Apollyon',
      command_chain: ['King', 'Brood Queen', 'General'],
      validator_realm_segregated: true,
    },
    identity_and_session_direction: {
      authorization_source: 'on_chain_role_plus_capability',
      bootstrap: 'challenge_response',
      persistent_authenticated_logical_session: true,
      provider_api_key_is_identity: false,
    },
    runtime_and_network_memory: {
      ollama_api: 'loopback',
      ollama_model_non_loopback_egress_denied: true,
      ollama_service_boot_enabled: false,
      ollama_service_can_read_nodekey: false,
      ollama_service_can_read_void_repo: false,
    },
    validator_separation: {
      consensus_mutation: false,
      validator_admission_authority: false,
      validator_command_authority: false,
      validator_key_access: false,
      validator_removal_authority: false,
      validator_signing: false,
      validator_stake_mutation: false,
    },
    apollyon_work_contract: {
      constitutional_ambiguity_requires_review: true,
      direct_repo_mutation_from_ollama_service: false,
      direct_secret_or_credential_access: false,
      direct_service_restart_or_deploy_authority: false,
      direct_validator_authority: false,
      direct_wallet_or_signer_access: false,
      outputs_are_proposals_or_evidence_until_independently_gated: true,
    },
    operating_model: {
      protect_core: true,
      agent_native_and_self_hosted_first: true,
    },
    project_identity: {
      canonical_domain: 'voidchain.org',
      chain_id: 2050,
      network: 'VOID Network',
      repo: '6ZoSo9/void-node',
    },
  };
}

function canonicalSafeProjectionBytes(projection) {
  return Buffer.from(`${JSON.stringify(projection, null, 2)}\n`, 'utf8');
}

export function sanitizeVerifiedContext(verified) {
  if (sha256(Buffer.from(SANITIZER_POLICY_DESCRIPTOR, 'utf8')) !== SANITIZER_POLICY_SHA256) {
    fail('sanitizer policy descriptor digest drifted');
  }
  if (!verified || verified.injection_authority !== false || !Buffer.isBuffer(verified.contextBytes)) {
    fail('raw verified context object required');
  }
  if (sha256(verified.contextBytes) !== verified.context_sha256) {
    fail('verified context byte identity drifted');
  }
  const pack = decodeContextBytes(verified.contextBytes);
  const projection = safeProjectionFromPack(pack, verified.context_sha256);
  const modelInputBytes = canonicalSafeProjectionBytes(projection);
  return {
    marker: SANITIZER_POLICY_MARKER,
    sanitizer_policy_sha256: SANITIZER_POLICY_SHA256,
    source_context_sha256: verified.context_sha256,
    model_input_sha256: sha256(modelInputBytes),
    candidate_digest: CANDIDATE_DIGEST,
    modelInputBytes,
    model_input_authority: true,
  };
}

export function authorizeModelInput(candidate) {
  if (!candidate || candidate.marker !== SANITIZER_POLICY_MARKER || candidate.model_input_authority !== true) {
    fail('model input requires sanitized projection authority');
  }
  if (candidate.sanitizer_policy_sha256 !== SANITIZER_POLICY_SHA256) fail('sanitizer policy drifted');
  if (candidate.candidate_digest !== CANDIDATE_DIGEST) fail('sanitized candidate digest drifted');
  if (!/^[0-9a-f]{64}$/.test(candidate.source_context_sha256 ?? '')) fail('sanitized source context digest invalid');
  if (!Buffer.isBuffer(candidate.modelInputBytes)) fail('sanitized model input bytes required');
  if (sha256(candidate.modelInputBytes) !== candidate.model_input_sha256) fail('sanitized model input digest drifted');
  let projection;
  try { projection = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(candidate.modelInputBytes)); }
  catch { fail('sanitized model input must be canonical UTF-8 JSON'); }
  const expected = safeProjectionFromPack({}, candidate.source_context_sha256);
  if (!canonicalSafeProjectionBytes(expected).equals(candidate.modelInputBytes)) {
    fail('sanitized model input is not exact safe projection');
  }
  if (projection.source_context_sha256 !== candidate.source_context_sha256) {
    fail('sanitized projection source generation drifted');
  }
  return Buffer.from(candidate.modelInputBytes);
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (command === 'admit' && args.length === 2) {
    const receipt = await admitContext(args[0], args[1]);
    process.stdout.write(`${RECEIPT_MARKER}_GREEN context_sha256=${receipt.context_sha256} injection_authority=false sanitization_required=true\n`);
    return;
  }
  if (command === 'verify' && args.length === 2) {
    const verified = await verifyContextReceipt(args[0], args[1]);
    process.stdout.write(`${RECEIPT_MARKER}_VERIFY_GREEN context_sha256=${verified.context_sha256} diagnostic_only=true reopen_context_path=false\n`);
    return;
  }
  if (command === 'sanitize' && args.length === 2) {
    const verified = await verifyContextReceipt(args[0], args[1]);
    const sanitized = sanitizeVerifiedContext(verified);
    process.stdout.write(`${SANITIZER_POLICY_MARKER}_GREEN source_context_sha256=${sanitized.source_context_sha256} model_input_sha256=${sanitized.model_input_sha256}\n`);
    return;
  }
  process.stderr.write('usage: void_brood_queen_local_context_admission_v1.mjs admit|verify|sanitize <context.json> <receipt.json>\n');
  process.exitCode = 64;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
    process.exitCode = 2;
  });
}
