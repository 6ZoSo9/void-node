#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const DOC = 'docs/governance/void-brood-queen-private-broker-contract-v1.md';
const FIXTURE = 'fixtures/governance/void-brood-queen-private-broker-contract-v1.json';
const IDENTITY = 'fixtures/governance/void-brood-queen-cryptographic-identity-contract-v1.json';
const SEAT = 'fixtures/governance/void-brood-queen-local-model-seat-v1.json';

const MARKER = 'VOID_BROOD_QUEEN_PRIVATE_BROKER_CONTRACT_V1_20260822';
const IDENTITY_MARKER = 'VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822';
const SEAT_MARKER = 'VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_20260822';

function hold(message) {
  throw new Error(message);
}

function requireTrue(value, name) {
  if (value !== true) hold(`${name} must be true`);
}

function requireFalse(value, name) {
  if (value !== false) hold(`${name} must be false`);
}

function exactArray(actual, expected, name) {
  if (!Array.isArray(actual)) hold(`${name} must be array`);
  if (actual.length !== expected.length) hold(`${name} length drifted`);
  for (let i = 0; i < expected.length; i += 1) {
    if (actual[i] !== expected[i]) hold(`${name}[${i}] drifted`);
  }
}

async function main() {
  const [doc, fixtureText, identityText, seatText] = await Promise.all([
    readFile(DOC, 'utf8'),
    readFile(FIXTURE, 'utf8'),
    readFile(IDENTITY, 'utf8'),
    readFile(SEAT, 'utf8'),
  ]);

  const f = JSON.parse(fixtureText);
  const identity = JSON.parse(identityText);
  const seat = JSON.parse(seatText);

  if (f.marker !== MARKER) hold('private broker marker drift');
  if (identity.marker !== IDENTITY_MARKER) hold('identity parent marker drift');
  if (seat.marker !== SEAT_MARKER) hold('local-seat parent marker drift');
  if (f.parent_identity_contract_marker !== IDENTITY_MARKER) hold('fixture identity parent drift');
  if (f.parent_local_seat_marker !== SEAT_MARKER) hold('fixture local-seat parent drift');

  if (f.network?.chain_id !== 2050) hold('chain id drift');
  if (f.network?.office !== 'Brood Queen' || f.network?.identity !== 'Ren') hold('Crown office identity drift');
  requireTrue(f.network.provider_neutral, 'provider neutrality');

  if (f.root_identity?.algorithm !== 'Ed25519') hold('root identity algorithm drift');
  requireFalse(f.root_identity.private_key_enters_model_context, 'root key model-context access');
  requireFalse(f.root_identity.private_key_enters_repository, 'root key repository access');
  requireFalse(f.root_identity.private_key_enters_github, 'root key GitHub access');
  requireFalse(f.root_identity.private_key_accessible_to_apollyon, 'root key Apollyon access');

  requireFalse(f.session_adapter.adapter_is_constitutional_identity, 'adapter constitutional identity');
  requireTrue(f.session_adapter.bootstrap_challenge_single_use, 'single-use challenge');
  requireTrue(f.session_adapter.bootstrap_binds_adapter_public_key, 'adapter public-key binding');
  requireTrue(f.session_adapter.persistent_logical_session, 'persistent logical session');
  requireTrue(f.session_adapter.session_id_stable_across_automatic_rotation, 'stable session id');

  if (f.crypto_profile.root_signature !== 'Ed25519') hold('root signature drift');
  if (f.crypto_profile.session_signature !== 'Ed25519') hold('session signature drift');
  if (f.crypto_profile.key_agreement !== 'X25519') hold('key agreement drift');
  if (f.crypto_profile.kdf !== 'HKDF-SHA-256') hold('KDF drift');
  if (f.crypto_profile.aead !== 'ChaCha20-Poly1305') hold('AEAD drift');
  requireTrue(f.crypto_profile.transport_confidentiality_required, 'transport confidentiality');
  requireFalse(f.crypto_profile.algorithm_agility_within_v1_session, 'in-session algorithm agility');

  requireTrue(f.ordering.sequence_monotonic, 'monotonic sequence');
  requireTrue(f.ordering.accept_only_next_expected_sequence, 'next-sequence admission');
  requireTrue(f.ordering.duplicate_identical_task_returns_prior_authoritative_result, 'duplicate idempotence');
  requireTrue(f.ordering.same_sequence_different_bytes_terminal_conflict, 'sequence conflict terminal');
  requireFalse(f.ordering.silent_reordering_allowed, 'silent reordering');

  if (f.task_identity?.prefix !== 'voidbqt1_') hold('task id prefix drift');
  requireTrue(f.task_identity.content_addressed, 'content-addressed task');
  requireTrue(f.task_identity.binds_session_id, 'task session binding');
  requireTrue(f.task_identity.binds_session_generation, 'task generation binding');
  requireTrue(f.task_identity.binds_sequence, 'task sequence binding');
  requireTrue(f.task_identity.binds_capabilities, 'task capability binding');
  requireTrue(f.task_identity.binds_payload_digest, 'task payload binding');
  requireTrue(f.task_identity.binds_policy_generation, 'task policy binding');

  requireFalse(f.capability_boundary.authentication_implies_capability, 'auth implies capability');
  requireTrue(f.capability_boundary.v1_proposal_evidence_only, 'V1 proposal/evidence only');
  requireFalse(f.capability_boundary.validator_capability_present, 'validator capability');
  requireFalse(f.capability_boundary.wallet_or_signer_capability_implicit, 'wallet/signer implicit');
  requireFalse(f.capability_boundary.deployment_or_restart_capability_implicit, 'deploy/restart implicit');
  requireFalse(f.capability_boundary.live_runtime_mutation_implicit, 'runtime mutation implicit');
  requireFalse(f.capability_boundary.transaction_or_funds_capability_implicit, 'funds implicit');
  requireFalse(f.capability_boundary.work_credit_mutation_implicit, 'WC implicit');
  requireFalse(f.capability_boundary.credential_reading_implicit, 'credential reading implicit');

  if (f.apollyon?.office !== 'General') hold('Apollyon office drift');
  requireTrue(f.apollyon.subordinate_compute, 'Apollyon subordinate compute');
  requireFalse(f.apollyon.authenticated_crown_endpoint, 'Apollyon Crown endpoint');
  requireFalse(f.apollyon.may_receive_root_key, 'Apollyon root key');
  requireFalse(f.apollyon.may_receive_session_private_key, 'Apollyon session key');
  requireFalse(f.apollyon.may_receive_validator_key, 'Apollyon validator key');
  requireFalse(f.apollyon.model_output_is_authoritative_receipt, 'model output authoritative receipt');

  requireTrue(f.private_context.stays_local_on_precision, 'context local');
  requireFalse(f.private_context.sent_as_blob_to_remote_provider, 'context remote blob');
  requireTrue(f.private_context.receipt_may_bind_context_sha256, 'context digest binding');
  requireFalse(f.private_context.receipt_exposes_context_bytes, 'context bytes receipt');
  requireFalse(f.private_context.receipt_exposes_local_path, 'context path receipt');

  exactArray(f.durable_state_machine.states, [
    'RECEIVED', 'ADMITTED', 'EXECUTING', 'RESULT_STAGED', 'RESULT_PUBLISHED', 'COMPLETE'
  ], 'durable states');
  exactArray(f.durable_state_machine.fail_closed_terminals, [
    'REJECTED', 'EXPIRED', 'REVOKED', 'SEQUENCE_CONFLICT', 'SESSION_STALE', 'POLICY_MISMATCH', 'RESULT_CONFLICT'
  ], 'fail-closed terminals');
  requireTrue(f.durable_state_machine.admitted_durable_before_inference, 'admitted durable before inference');
  requireTrue(f.durable_state_machine.result_staged_durable_before_publication, 'result staged before publication');
  requireTrue(f.durable_state_machine.publication_retry_reuses_staged_result, 'publication retry staged reuse');
  requireFalse(f.durable_state_machine.publication_retry_reexecutes_inference, 'publication retry inference');
  requireTrue(f.durable_state_machine.complete_binds_one_authoritative_result_hash, 'single authoritative result');
  requireTrue(f.durable_state_machine.recovery_distinguishes_owned_from_foreign_state, 'owned-vs-foreign recovery');

  requireTrue(f.revocation.canonical_role_revalidation_required, 'canonical role revalidation');
  requireFalse(f.revocation.cached_role_truth_survives_revocation, 'cached role survives revocation');
  requireFalse(f.revocation.stale_generation_can_issue_ordinary_tasks, 'stale session ordinary tasks');

  requireFalse(f.threat_model.github_authenticates_crown_session, 'GitHub Crown auth');
  requireFalse(f.threat_model.model_self_claim_authenticates_crown_session, 'model self-claim Crown auth');
  requireTrue(f.threat_model.duplicate_delivery_idempotent, 'duplicate delivery idempotence');
  requireFalse(f.threat_model.delayed_delivery_can_rollback_sequence, 'delayed sequence rollback');
  requireFalse(f.threat_model.task_result_substitution_preserves_identity, 'substitution preserves identity');
  requireFalse(f.threat_model.restart_after_result_staged_creates_second_authoritative_result, 'restart duplicate authoritative result');

  requireTrue(f.strongest_invariant.at_most_one_authoritative_completed_result_hash_per_task_id, 'single result invariant');
  requireTrue(f.strongest_invariant.no_capability_expansion_beyond_exact_list, 'capability exactness invariant');
  requireTrue(f.strongest_invariant.no_validator_authority_path, 'validator wall invariant');
  requireTrue(f.strongest_invariant.no_crown_private_material_in_model_context, 'Crown private material invariant');

  for (const [key, value] of Object.entries(f.activation)) {
    requireFalse(value, `activation.${key}`);
  }

  for (const required of [
    MARKER,
    IDENTITY_MARKER,
    SEAT_MARKER,
    'task_id = voidbqt1_ + sha256(canonical_task_without_task_id)',
    'RESULT_STAGED',
    'GitHub identity, provider identity, and model self-description are not Crown authentication.',
    'Validator capability is structurally absent from this broker contract.',
    'at most one authoritative completed result hash',
  ]) {
    if (!doc.includes(required)) hold(`doc missing required binding: ${required}`);
  }

  const secretShapes = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
  ];
  for (const pattern of secretShapes) {
    if (pattern.test(fixtureText)) hold(`fixture contains secret-like material: ${pattern}`);
  }

  process.stdout.write('VOID_BROOD_QUEEN_PRIVATE_BROKER_CONTRACT_V1_PROOF_GREEN\n');
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
