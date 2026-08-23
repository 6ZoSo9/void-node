#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { constants as FS } from 'node:fs';
import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const CONTEXT_MARKER = 'VOID_BROOD_QUEEN_LOCAL_CONTEXT_PACK_V1';
export const CONTEXT_VERSION = '2.0.0';
export const RECEIPT_MARKER = 'VOID_BROOD_QUEEN_LOCAL_CONTEXT_ADMISSION_RECEIPT_V1';
export const MAX_CONTEXT_BYTES = 256 * 1024;
export const PARENT_POLICY_SHA256 = '6fdac6f3851ea62fbfcc90f39568b881b8bc18a9469df0d702373039b4244155';
export const COMMAND_LAYER_MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
export const COMMAND_LAYER_SHA256 = 'f3b155ab9df462f7a4f0981a52aca15ec640548c19c7e81c24e883513112adbd';
export const CANDIDATE_DIGEST = 'ac1de81fc81bba23802b75e8d46beb1583785c14f94210af94e4e6901f93be3b';

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
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${name} has unexpected fields`);
  }
}
function requireBool(value, expected, name) { if (value !== expected) fail(`${name} must be ${expected}`); }
function requireString(value, name) { if (typeof value !== 'string' || value.length === 0) fail(`${name} must be non-empty string`); }
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function stamp(stat) {
  return {
    dev: stat.dev.toString(), ino: stat.ino.toString(), size: stat.size.toString(),
    mtimeNs: stat.mtimeNs.toString(), ctimeNs: stat.ctimeNs.toString(),
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
    if (stat.size > BigInt(MAX_CONTEXT_BYTES)) fail(`context exceeds ${MAX_CONTEXT_BYTES} bytes`);
    return { fh, preStamp: stamp(stat) };
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
  const postStamp = stamp(await fh.stat({ bigint: true }));
  if (!sameStamp(preStamp, postStamp)) fail('context file generation changed during bounded read');
  return Buffer.concat(chunks, total);
}

function scanSecretShapes(value, path = '$') {
  if (typeof value === 'string') {
    const patterns = [
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
      /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
      /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
      /\bAKIA[0-9A-Z]{16}\b/,
      /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}\b/i,
    ];
    for (const pattern of patterns) if (pattern.test(value)) fail(`secret-like value rejected at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanSecretShapes(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) scanSecretShapes(child, `${path}.${key}`);
    return;
  }
  if (value !== null && !['boolean', 'number'].includes(typeof value)) fail(`non-JSON value at ${path}`);
}

export function validateContextPack(pack) {
  exactKeys(pack, TOP_KEYS, 'context');
  for (const [key, keys] of Object.entries(OBJECT_KEYS)) exactKeys(pack[key], keys, `context.${key}`);
  if (pack.marker !== CONTEXT_MARKER) fail('context marker drifted');
  if (pack.version !== CONTEXT_VERSION) fail('context version drifted');
  if (pack.classification !== 'private_local') fail('context classification must be private_local');
  requireString(pack.created_at_utc, 'created_at_utc');
  requireString(pack.source, 'source');

  const a = pack.authority_semantics;
  requireBool(a.context_is_reference_data_not_higher_priority_instruction, true, 'authority_semantics.context_is_reference_data_not_higher_priority_instruction');
  requireBool(a.crown_private_material_present, false, 'authority_semantics.crown_private_material_present');
  requireBool(a.model_self_claim_is_authentication, false, 'authority_semantics.model_self_claim_is_authentication');
  requireBool(a.raw_chat_import_automatic, false, 'authority_semantics.raw_chat_import_automatic');
  requireBool(a.validator_authority_present, false, 'authority_semantics.validator_authority_present');

  const c = pack.constitutional_binding;
  if (c.chain_id !== 2050) fail('constitutional_binding.chain_id drifted');
  if (c.command_layer_marker !== COMMAND_LAYER_MARKER) fail('command layer marker drifted');
  if (c.command_layer_sha256 !== COMMAND_LAYER_SHA256) fail('command layer digest drifted');
  requireBool(c.validator_realm_segregated, true, 'constitutional_binding.validator_realm_segregated');

  const o = pack.office_separation;
  requireBool(o.apollyon_is_general_office, true, 'office_separation.apollyon_is_general_office');
  requireBool(o.apollyon_is_not_ren, true, 'office_separation.apollyon_is_not_ren');
  requireBool(o.local_model_may_authenticate_as_brood_queen, false, 'office_separation.local_model_may_authenticate_as_brood_queen');
  requireBool(o.local_model_may_impersonate_ren, false, 'office_separation.local_model_may_impersonate_ren');
  requireBool(o.local_model_may_inherit_brood_queen_root_key, false, 'office_separation.local_model_may_inherit_brood_queen_root_key');
  requireBool(o.local_model_may_inherit_brood_queen_session, false, 'office_separation.local_model_may_inherit_brood_queen_session');
  requireBool(o.local_model_output_is_crown_authentication, false, 'office_separation.local_model_output_is_crown_authentication');
  requireBool(o.ren_is_brood_queen_office, true, 'office_separation.ren_is_brood_queen_office');

  const v5 = pack.v5_candidate;
  if (v5.candidate_digest !== CANDIDATE_DIGEST) fail('candidate digest drifted');
  if (!/^[0-9a-f]{64}$/.test(v5.base_digest ?? '')) fail('base digest invalid');
  if (!/^[0-9a-f]{64}$/.test(v5.system_prompt_body_sha256 ?? '')) fail('system prompt body digest invalid');
  if (!/^[0-9a-f]{64}$/.test(v5.system_prompt_ollama_sha256 ?? '')) fail('system prompt framing digest invalid');
  requireBool(v5.v5_adversarial_canaries_green, true, 'v5_candidate.v5_adversarial_canaries_green');

  const work = pack.apollyon_work_contract;
  for (const key of [
    'direct_repo_mutation_from_ollama_service', 'direct_secret_or_credential_access',
    'direct_service_restart_or_deploy_authority', 'direct_validator_authority', 'direct_wallet_or_signer_access',
  ]) requireBool(work[key], false, `apollyon_work_contract.${key}`);
  requireBool(work.constitutional_ambiguity_requires_review, true, 'apollyon_work_contract.constitutional_ambiguity_requires_review');
  requireBool(work.fabricated_execution_or_receipts_forbidden, true, 'apollyon_work_contract.fabricated_execution_or_receipts_forbidden');
  requireBool(work.outputs_are_proposals_or_evidence_until_independently_gated, true, 'apollyon_work_contract.outputs_are_proposals_or_evidence_until_independently_gated');

  const validators = pack.validator_separation;
  for (const key of [
    'consensus_mutation', 'validator_admission_authority', 'validator_command_authority', 'validator_key_access',
    'validator_removal_authority', 'validator_signing', 'validator_stake_mutation',
  ]) requireBool(validators[key], false, `validator_separation.${key}`);

  const memory = pack.memory_policy;
  requireBool(memory.include_secrets, false, 'memory_policy.include_secrets');
  requireBool(memory.include_irrelevant_personal_information, false, 'memory_policy.include_irrelevant_personal_information');
  requireBool(memory.raw_transcript_dump, false, 'memory_policy.raw_transcript_dump');

  const security = pack.security_memory;
  for (const [key, value] of Object.entries(security)) requireBool(value, true, `security_memory.${key}`);

  const learning = pack.apollyon_learning;
  if (!Number.isInteger(learning.generation) || learning.generation < 2) fail('apollyon_learning.generation must be integer >= 2');
  requireBool(learning.weights_changed, false, 'apollyon_learning.weights_changed');
  requireBool(learning.candidate_digest_unchanged, true, 'apollyon_learning.candidate_digest_unchanged');

  scanSecretShapes(pack);
  return true;
}

export async function readAndValidateContext(path) {
  const { fh, preStamp } = await openPinnedPrivateContext(path);
  try {
    const bytes = await readPinnedPrivateContextBytes(fh, preStamp);
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { fail('context must be strict UTF-8'); }
    let pack;
    try { pack = JSON.parse(text); } catch { fail('context must contain valid JSON'); }
    validateContextPack(pack);
    return { pack, bytes };
  } finally {
    await fh.close();
  }
}

function receiptFor(pack, bytes) {
  return {
    marker: RECEIPT_MARKER,
    schema_marker: CONTEXT_MARKER,
    schema_version: CONTEXT_VERSION,
    parent_policy_sha256: PARENT_POLICY_SHA256,
    context_sha256: sha256(bytes),
    byte_length: bytes.length,
    command_layer_sha256: pack.constitutional_binding.command_layer_sha256,
    candidate_digest: pack.v5_candidate.candidate_digest,
  };
}

function validateReceiptShape(receipt) {
  exactKeys(receipt, [
    'marker', 'schema_marker', 'schema_version', 'parent_policy_sha256', 'context_sha256',
    'byte_length', 'command_layer_sha256', 'candidate_digest',
  ], 'receipt');
  if (receipt.marker !== RECEIPT_MARKER) fail('receipt marker drifted');
  if (receipt.schema_marker !== CONTEXT_MARKER) fail('receipt schema marker drifted');
  if (receipt.schema_version !== CONTEXT_VERSION) fail('receipt schema version drifted');
  if (receipt.parent_policy_sha256 !== PARENT_POLICY_SHA256) fail('receipt parent policy drifted');
  if (!/^[0-9a-f]{64}$/.test(receipt.context_sha256 ?? '')) fail('receipt context digest invalid');
  if (!Number.isInteger(receipt.byte_length) || receipt.byte_length < 1 || receipt.byte_length > MAX_CONTEXT_BYTES) fail('receipt byte length invalid');
  if (receipt.command_layer_sha256 !== COMMAND_LAYER_SHA256) fail('receipt command layer digest drifted');
  if (receipt.candidate_digest !== CANDIDATE_DIGEST) fail('receipt candidate digest drifted');
}

async function writeReceipt(path, receipt) {
  const fh = await open(path, 'wx', 0o600);
  try {
    await fh.writeFile(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    await fh.sync();
  } finally { await fh.close(); }
}

export async function admitContext(contextPath, receiptPath) {
  const { pack, bytes } = await readAndValidateContext(contextPath);
  const receipt = receiptFor(pack, bytes);
  validateReceiptShape(receipt);
  await writeReceipt(receiptPath, receipt);
  return receipt;
}

export async function verifyContextReceipt(contextPath, receiptPath) {
  const { pack, bytes } = await readAndValidateContext(contextPath);
  const receiptFile = await readAndValidateReceipt(receiptPath);
  const expected = receiptFor(pack, bytes);
  if (JSON.stringify(receiptFile) !== JSON.stringify(expected)) fail('receipt does not bind exact admitted context generation');
  return expected;
}

async function readAndValidateReceipt(path) {
  let fh;
  try {
    fh = await open(path, FS.O_RDONLY | FS.O_NOFOLLOW);
    const stat = await fh.stat({ bigint: true });
    if (!stat.isFile()) fail('receipt must be regular file');
    if (stat.uid !== BigInt(process.getuid())) fail('receipt must be owned by current operator uid');
    if ((Number(stat.mode) & 0o777) !== 0o600) fail('receipt mode must be exactly 0600');
    if (stat.size > 4096n) fail('receipt is oversized');
    const bytes = Buffer.alloc(Number(stat.size));
    const { bytesRead } = await fh.read(bytes, 0, bytes.length, 0);
    if (bytesRead !== bytes.length) fail('receipt short read');
    let receipt;
    try { receipt = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { fail('receipt must be strict UTF-8 JSON'); }
    validateReceiptShape(receipt);
    return receipt;
  } finally { if (fh) await fh.close(); }
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (command === 'admit' && args.length === 2) {
    const receipt = await admitContext(args[0], args[1]);
    process.stdout.write(`${RECEIPT_MARKER}_GREEN context_sha256=${receipt.context_sha256}\n`);
    return;
  }
  if (command === 'verify' && args.length === 2) {
    const receipt = await verifyContextReceipt(args[0], args[1]);
    process.stdout.write(`${RECEIPT_MARKER}_VERIFY_GREEN context_sha256=${receipt.context_sha256}\n`);
    return;
  }
  process.stderr.write('usage: void_brood_queen_local_context_admission_v1.mjs admit <context.json> <receipt.json>\n');
  process.stderr.write('       void_brood_queen_local_context_admission_v1.mjs verify <context.json> <receipt.json>\n');
  process.exitCode = 64;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
