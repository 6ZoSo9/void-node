#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const DOC = 'docs/governance/void-brood-queen-private-broker-contract-v1.md';
const FIXTURE = 'fixtures/governance/void-brood-queen-private-broker-contract-v1.json';
const IDENTITY = 'fixtures/governance/void-brood-queen-cryptographic-identity-contract-v1.json';
const SEAT = 'fixtures/governance/void-brood-queen-local-model-seat-v1.json';

const MARKER = 'VOID_BROOD_QUEEN_PRIVATE_BROKER_CONTRACT_V1_20260822';
const IDENTITY_MARKER = 'VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822';
const SEAT_MARKER = 'VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_20260822';
const IDENTITY_HEAD = '8ac42d13f684d9898318af9359edc3553961909b';
const IDENTITY_BLOB = 'b8159343b176fdfc745fec0afb8ebf0db512ac9b';
const SEAT_HEAD = '2ddbbd3498915d77c410f350c4e1dadb1cfa951c';
const SEAT_BLOB = 'eb96412ce2444232aa64b0df4b8889faf92d0ff9';
const PARENT_POLICY_DOMAIN = 'VOID_BROOD_QUEEN_PARENT_POLICY_IDENTITY_V1';
const PARENT_POLICY_SHA = '2d2ff57721e64728569019531f908cb936826bea3d78e012871f91833bd1b630';
const POLICY_DOMAIN = 'VOID_BROOD_QUEEN_PRIVATE_BROKER_POLICY_V1';
const POLICY_SHA = 'e85eeaecb0fc289d377b76c49839f7c020fc119d541c04b575a711f24c22e6bf';
const V1_CAPS = ['analysis','drafting','proof_design','review','test_generation','bounded_task_planning','evidence_synthesis'];

function hold(message) { throw new Error(message); }
function requireTrue(value, name) { if (value !== true) hold(`${name} must be true`); }
function requireFalse(value, name) { if (value !== false) hold(`${name} must be false`); }
function exactArray(actual, expected, name) {
  if (!Array.isArray(actual)) hold(`${name} must be array`);
  if (actual.length !== expected.length) hold(`${name} length drifted`);
  for (let i = 0; i < expected.length; i += 1) if (actual[i] !== expected[i]) hold(`${name}[${i}] drifted`);
}
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function gitBlob(path) {
  return execFileSync('git', ['hash-object', path], { encoding: 'utf8' }).trim();
}

async function main() {
  const [doc, fixtureText, identityText, seatText] = await Promise.all([
    readFile(DOC, 'utf8'), readFile(FIXTURE, 'utf8'), readFile(IDENTITY, 'utf8'), readFile(SEAT, 'utf8'),
  ]);
  const f = JSON.parse(fixtureText);
  const identity = JSON.parse(identityText);
  const seat = JSON.parse(seatText);

  if (f.marker !== MARKER) hold('private broker marker drift');
  if (identity.marker !== IDENTITY_MARKER) hold('identity parent marker drift');
  if (seat.marker !== SEAT_MARKER) hold('local-seat parent marker drift');
  if (f.parent_identity_contract_marker !== IDENTITY_MARKER) hold('fixture identity parent drift');
  if (f.parent_local_seat_marker !== SEAT_MARKER) hold('fixture local-seat parent drift');

  if (f.parent_binding?.domain !== PARENT_POLICY_DOMAIN) hold('parent policy domain drift');
  if (f.parent_binding.identity_reviewed_head !== IDENTITY_HEAD) hold('identity reviewed head drift');
  if (f.parent_binding.identity_fixture_blob_sha !== IDENTITY_BLOB) hold('identity fixture blob declaration drift');
  if (f.parent_binding.local_seat_reviewed_head !== SEAT_HEAD) hold('local-seat reviewed head drift');
  if (f.parent_binding.local_seat_fixture_blob_sha !== SEAT_BLOB) hold('local-seat fixture blob declaration drift');
  if (gitBlob(IDENTITY) !== IDENTITY_BLOB) hold('identity parent exact content drift');
  if (gitBlob(SEAT) !== SEAT_BLOB) hold('local-seat parent exact content drift');
  const parentPolicyPreimage = `${PARENT_POLICY_DOMAIN}\nidentity_commit=${IDENTITY_HEAD}\nidentity_fixture_blob=${IDENTITY_BLOB}\nlocal_seat_commit=${SEAT_HEAD}\nlocal_seat_fixture_blob=${SEAT_BLOB}\n`;
  if (sha256(parentPolicyPreimage) !== PARENT_POLICY_SHA) hold('parent policy digest preimage mismatch');
  if (f.parent_binding.parent_policy_sha256 !== PARENT_POLICY_SHA) hold('parent policy digest drift');
  requireTrue(f.parent_binding.same_marker_parent_content_drift_fails_closed, 'same-marker parent drift hold');
  requireTrue(f.parent_binding.bootstrap_and_rotation_bind_parent_policy_sha256, 'parent policy bootstrap/rotation binding');

  if (f.network?.chain_id !== 2050) hold('chain id drift');
  if (f.network?.office !== 'Brood Queen' || f.network?.identity !== 'Ren') hold('Crown office identity drift');
  requireTrue(f.network.provider_neutral, 'provider neutrality');

  if (f.root_identity?.algorithm !== 'Ed25519') hold('root identity algorithm drift');
  requireFalse(f.root_identity.private_key_enters_model_context, 'root key model-context access');
  requireFalse(f.root_identity.private_key_enters_repository, 'root key repository access');
  requireFalse(f.root_identity.private_key_enters_github, 'root key GitHub access');
  requireFalse(f.root_identity.private_key_accessible_to_apollyon, 'root key Apollyon access');

  if (f.broker_identity?.algorithm !== 'Ed25519') hold('broker identity algorithm drift');
  requireTrue(f.broker_identity.public_identity_pinned_before_bootstrap, 'broker identity pinning');
  requireFalse(f.broker_identity.private_key_enters_model_context, 'broker private key model-context access');
  requireTrue(f.broker_identity.bootstrap_challenge_signature_required, 'broker challenge signature');
  if (f.broker_identity.bootstrap_challenge_domain !== 'VOID_BROOD_QUEEN_BROKER_BOOTSTRAP_CHALLENGE_V1') hold('broker challenge domain drift');
  if (f.broker_identity.crown_bootstrap_approval_domain !== 'VOID_BROOD_QUEEN_CROWN_BOOTSTRAP_APPROVAL_V1') hold('Crown bootstrap domain drift');
  if (f.broker_identity.receipt_signature_domain !== 'VOID_BROOD_QUEEN_BROKER_RECEIPT_V1') hold('receipt signature domain drift');
  requireTrue(f.broker_identity.receipt_signed_by_broker_identity, 'broker receipt signature');
  requireFalse(f.broker_identity.transport_tls_alone_authenticates_crown_or_broker, 'TLS-only Crown/broker authentication');

  requireFalse(f.session_adapter.adapter_is_constitutional_identity, 'adapter constitutional identity');
  requireTrue(f.session_adapter.bootstrap_challenge_single_use, 'single-use challenge');
  requireTrue(f.session_adapter.bootstrap_binds_adapter_public_key, 'adapter signing-key binding');
  requireTrue(f.session_adapter.bootstrap_binds_adapter_x25519_public_key, 'adapter X25519 binding');
  requireTrue(f.session_adapter.bootstrap_binds_broker_x25519_public_key, 'broker X25519 binding');
  requireTrue(f.session_adapter.persistent_logical_session, 'persistent logical session');
  requireTrue(f.session_adapter.session_id_stable_across_automatic_rotation, 'stable session id');

  if (f.crypto_profile.root_signature !== 'Ed25519') hold('root signature drift');
  if (f.crypto_profile.broker_identity_signature !== 'Ed25519') hold('broker identity signature drift');
  if (f.crypto_profile.session_signature !== 'Ed25519') hold('session signature drift');
  if (f.crypto_profile.session_message_signature_domain !== 'VOID_BROOD_QUEEN_SESSION_MESSAGE_V1') hold('session message domain drift');
  if (f.crypto_profile.session_rotation_signature_domain !== 'VOID_BROOD_QUEEN_SESSION_ROTATION_V1') hold('session rotation domain drift');
  if (f.crypto_profile.key_agreement !== 'X25519') hold('key agreement drift');
  requireTrue(f.crypto_profile.all_zero_x25519_shared_secret_rejected, 'all-zero X25519 rejection');
  if (f.crypto_profile.kdf !== 'HKDF-SHA-256') hold('KDF drift');
  if (f.crypto_profile.aead !== 'ChaCha20-Poly1305') hold('AEAD drift');
  requireTrue(f.crypto_profile.transport_confidentiality_required, 'transport confidentiality');
  requireFalse(f.crypto_profile.algorithm_agility_within_v1_session, 'in-session algorithm agility');
  requireFalse(f.crypto_profile.ecdsa_substitution_allowed, 'ECDSA substitution');
  requireTrue(f.crypto_profile.generation_transcript_is_hkdf_salt, 'generation transcript HKDF salt');
  requireTrue(f.crypto_profile.directional_traffic_key_separation, 'directional traffic key separation');
  requireFalse(f.crypto_profile.traffic_key_reused_across_generations, 'traffic key generation reuse');
  requireFalse(f.crypto_profile.traffic_key_reused_across_directions, 'traffic key direction reuse');
  if (f.crypto_profile.aead_nonce_source !== 'uint96_transport_sequence') hold('AEAD nonce source drift');
  requireTrue(f.crypto_profile.aead_nonce_unique_per_generation_direction, 'AEAD nonce uniqueness');
  requireFalse(f.crypto_profile.same_key_nonce_different_protected_bytes_allowed, 'AEAD nonce/key distinct-message reuse');
  requireTrue(f.crypto_profile.exact_duplicate_retransmits_exact_protected_bytes, 'exact duplicate protected-byte reuse');
  requireTrue(f.crypto_profile.ciphertext_sha256_is_not_aad_or_plaintext_input, 'non-self-referential ciphertext hash');

  for (const key of [
    'applies_both_directions','reservation_durable_before_aead_invocation','reservation_binds_exact_message_identity',
    'protected_bytes_durable_before_first_release','retry_retransmits_exact_staged_protected_bytes',
    'reserved_sequence_never_recycled_for_different_message','crash_before_protected_stage_may_only_reconstruct_same_message_or_hold_rotate',
    'uncertain_nonce_state_holds_or_rotates_generation','receiver_conflict_check_is_not_primary_nonce_safety'
  ]) requireTrue(f.outbound_transport_journal?.[key], `outbound transport journal ${key}`);

  requireTrue(f.ordering.task_sequence_monotonic, 'task sequence monotonic');
  requireTrue(f.ordering.accept_only_next_expected_task_sequence, 'next task sequence admission');
  requireTrue(f.ordering.transport_sequence_monotonic_per_generation_direction, 'transport sequence monotonic');
  requireTrue(f.ordering.duplicate_identical_task_returns_prior_authoritative_result, 'duplicate task idempotence');
  requireTrue(f.ordering.same_task_sequence_different_bytes_terminal_conflict, 'task sequence conflict terminal');
  requireTrue(f.ordering.same_transport_sequence_different_protected_bytes_terminal_conflict, 'transport sequence conflict terminal');
  requireFalse(f.ordering.silent_reordering_allowed, 'silent reordering');
  requireTrue(f.ordering.transport_and_task_sequence_are_distinct, 'transport/task sequence separation');

  if (f.task_identity?.prefix !== 'voidbqt1_') hold('task id prefix drift');
  for (const key of ['content_addressed','binds_session_id','binds_session_generation','binds_task_sequence','binds_capabilities','binds_capability_ceiling_digest','binds_payload_digest','binds_policy_generation','binds_policy_sha256','binds_parent_policy_sha256']) requireTrue(f.task_identity?.[key], `task identity ${key}`);

  requireFalse(f.capability_boundary.authentication_implies_capability, 'auth implies capability');
  requireTrue(f.capability_boundary.v1_proposal_evidence_only, 'V1 proposal/evidence only');
  exactArray(f.capability_boundary.v1_capability_ceiling, V1_CAPS, 'V1 capability ceiling');
  if (f.capability_boundary.policy_domain !== POLICY_DOMAIN) hold('policy domain drift');
  const policyPreimage = `${POLICY_DOMAIN}\nparent_policy_sha256=${PARENT_POLICY_SHA}\ncapability_ceiling=${V1_CAPS.join(',')}\nvalidator_capability_present=false\n`;
  if (sha256(policyPreimage) !== POLICY_SHA) hold('broker policy digest preimage mismatch');
  if (f.capability_boundary.policy_sha256 !== POLICY_SHA) hold('broker policy digest drift');
  requireFalse(f.capability_boundary.validator_capability_present, 'validator capability');
  requireFalse(f.capability_boundary.wallet_or_signer_capability_implicit, 'wallet/signer implicit');
  requireFalse(f.capability_boundary.deployment_or_restart_capability_implicit, 'deploy/restart implicit');
  requireFalse(f.capability_boundary.live_runtime_mutation_implicit, 'runtime mutation implicit');
  requireFalse(f.capability_boundary.transaction_or_funds_capability_implicit, 'funds implicit');
  requireFalse(f.capability_boundary.work_credit_mutation_implicit, 'WC implicit');
  requireFalse(f.capability_boundary.credential_reading_implicit, 'credential reading implicit');
  requireFalse(f.capability_boundary.session_rotation_can_expand_policy_ceiling, 'rotation capability expansion');
  requireTrue(f.capability_boundary.policy_or_ceiling_widening_requires_root_authenticated_boundary, 'root boundary for policy widening');

  for (const key of ['bootstrap_binds_exact_capability_ceiling_or_digest','bootstrap_binds_exact_policy_sha256','bootstrap_binds_parent_policy_sha256','successor_may_preserve_or_reduce_capability_ceiling','one_active_generation_atomically_bound','at_most_one_accepted_successor_transition','stale_generation_may_only_retransmit_exact_accepted_transition']) requireTrue(f.successor_authority?.[key], `successor authority ${key}`);
  requireFalse(f.successor_authority.successor_may_widen_capability_ceiling, 'successor ceiling widening');
  requireFalse(f.successor_authority.successor_may_change_policy_root_without_root_boundary, 'successor policy-root change');
  requireFalse(f.successor_authority.stale_generation_fresh_transition_authority_after_successor_activation, 'stale fresh transition authority');
  if (f.successor_authority.alternate_stale_successor_terminal !== 'SESSION_FORK_CONFLICT') hold('stale successor conflict terminal drift');

  if (f.apollyon?.office !== 'General') hold('Apollyon office drift');
  requireTrue(f.apollyon.subordinate_compute, 'Apollyon subordinate compute');
  requireFalse(f.apollyon.authenticated_crown_endpoint, 'Apollyon Crown endpoint');
  requireFalse(f.apollyon.may_receive_root_key, 'Apollyon root key');
  requireFalse(f.apollyon.may_receive_session_private_key, 'Apollyon session key');
  requireFalse(f.apollyon.may_receive_broker_identity_private_key, 'Apollyon broker identity key');
  requireFalse(f.apollyon.may_receive_validator_key, 'Apollyon validator key');
  requireFalse(f.apollyon.model_output_is_authoritative_receipt, 'model output authoritative receipt');

  requireTrue(f.private_context.stays_local_on_precision, 'context local');
  requireFalse(f.private_context.sent_as_blob_to_remote_provider, 'context remote blob');
  requireTrue(f.private_context.receipt_may_bind_context_sha256, 'context digest binding');
  requireFalse(f.private_context.receipt_exposes_context_bytes, 'context bytes receipt');
  requireFalse(f.private_context.receipt_exposes_local_path, 'context path receipt');

  exactArray(f.durable_state_machine.states, ['RECEIVED','ADMITTED','EXECUTING','RESULT_STAGED','RESULT_PUBLISHED','COMPLETE'], 'durable states');
  exactArray(f.durable_state_machine.fail_closed_terminals, ['REJECTED','EXPIRED','REVOKED','SEQUENCE_CONFLICT','TRANSPORT_SEQUENCE_CONFLICT','SESSION_FORK_CONFLICT','SESSION_STALE','POLICY_MISMATCH','EXECUTION_OUTCOME_UNKNOWN','RESULT_CONFLICT'], 'fail-closed terminals');
  requireTrue(f.durable_state_machine.admitted_durable_before_inference, 'admitted durable before inference');
  requireTrue(f.durable_state_machine.result_staged_durable_before_publication, 'result staged before publication');
  requireTrue(f.durable_state_machine.publication_retry_reuses_staged_result, 'publication retry staged reuse');
  requireFalse(f.durable_state_machine.publication_retry_reexecutes_inference, 'publication retry inference');
  requireFalse(f.durable_state_machine.executing_restart_without_staged_result_auto_reexecutes_inference, 'ambiguous execution automatic retry');
  if (f.durable_state_machine.executing_restart_without_staged_result_terminal !== 'EXECUTION_OUTCOME_UNKNOWN') hold('ambiguous execution terminal drift');
  requireFalse(f.durable_state_machine.exactly_once_model_execution_claimed, 'exactly-once model execution claim');
  requireTrue(f.durable_state_machine.exactly_once_authoritative_result_publication_required, 'exactly-once authoritative result publication');
  requireTrue(f.durable_state_machine.safe_retry_from_execution_outcome_unknown_requires_separate_idempotent_executor_contract, 'ambiguous execution retry gate');
  requireTrue(f.durable_state_machine.complete_binds_one_authoritative_result_hash, 'single authoritative result');
  requireTrue(f.durable_state_machine.recovery_distinguishes_owned_from_foreign_state, 'owned-vs-foreign recovery');

  requireTrue(f.revocation.canonical_role_revalidation_required, 'canonical role revalidation');
  requireTrue(f.revocation.bounded_role_freshness_required_before_task_admission, 'bounded role freshness');
  requireFalse(f.revocation.cached_role_truth_survives_revocation, 'cached role survives revocation');
  requireFalse(f.revocation.stale_generation_can_issue_ordinary_tasks, 'stale session ordinary tasks');

  requireFalse(f.threat_model.github_authenticates_crown_session, 'GitHub Crown auth');
  requireFalse(f.threat_model.transport_tls_alone_authenticates_crown_session, 'TLS-only Crown auth');
  requireFalse(f.threat_model.model_self_claim_authenticates_crown_session, 'model self-claim Crown auth');
  requireFalse(f.threat_model.unsigned_or_unpinned_broker_challenge_admitted, 'unsigned/unpinned broker challenge');
  requireTrue(f.threat_model.duplicate_delivery_idempotent, 'duplicate delivery idempotence');
  requireFalse(f.threat_model.delayed_delivery_can_rollback_sequence, 'delayed sequence rollback');
  requireFalse(f.threat_model.task_result_substitution_preserves_identity, 'substitution preserves identity');
  requireFalse(f.threat_model.same_aead_key_nonce_can_protect_distinct_messages, 'AEAD key/nonce distinct-message reuse');
  requireFalse(f.threat_model.sender_crash_can_recycle_nonce_for_different_message, 'sender crash nonce recycle');
  requireFalse(f.threat_model.stale_generation_can_create_fresh_successor_fork, 'stale generation successor fork');
  requireFalse(f.threat_model.same_marker_parent_content_drift_preserves_child_policy_identity, 'same-marker parent drift');
  requireFalse(f.threat_model.restart_after_result_staged_creates_second_authoritative_result, 'restart duplicate authoritative result');
  requireFalse(f.threat_model.restart_during_execution_claims_exactly_once_model_execution, 'restart exactly-once model execution claim');

  requireTrue(f.strongest_invariant.at_most_one_authoritative_completed_result_hash_per_task_id, 'single result invariant');
  requireTrue(f.strongest_invariant.does_not_claim_exactly_once_model_execution, 'no exactly-once execution invariant');
  requireTrue(f.strongest_invariant.no_capability_expansion_beyond_exact_list, 'capability exactness invariant');
  requireTrue(f.strongest_invariant.no_distinct_messages_share_aead_key_nonce_pair, 'AEAD nonce invariant');
  requireTrue(f.strongest_invariant.nonce_safety_survives_sender_crash, 'sender crash nonce invariant');
  requireTrue(f.strongest_invariant.no_stale_generation_successor_fork, 'successor fork invariant');
  requireTrue(f.strongest_invariant.parent_policy_identity_content_bound, 'parent policy content invariant');
  requireTrue(f.strongest_invariant.no_validator_authority_path, 'validator wall invariant');
  requireTrue(f.strongest_invariant.no_crown_broker_or_session_private_material_in_model_context, 'private material invariant');

  for (const [key, value] of Object.entries(f.activation)) requireFalse(value, `activation.${key}`);

  for (const required of [
    MARKER, IDENTITY_MARKER, SEAT_MARKER, PARENT_POLICY_SHA, POLICY_SHA,
    'VOID_BROOD_QUEEN_BROKER_BOOTSTRAP_CHALLENGE_V1',
    'VOID_BROOD_QUEEN_CROWN_BOOTSTRAP_APPROVAL_V1',
    'VOID_BROOD_QUEEN_BROKER_RECEIPT_V1',
    'VOID_BROOD_QUEEN_SESSION_MESSAGE_V1',
    'VOID_BROOD_QUEEN_SESSION_ROTATION_V1',
    'task_id = voidbqt1_ + sha256(canonical_task_without_task_id)',
    'uint96', 'transport_sequence', 'task_sequence', 'TRANSPORT_SEQUENCE_CONFLICT', 'SESSION_FORK_CONFLICT',
    'protected bytes are durably staged before the first byte may be released',
    'zero fresh transition authority',
    'RESULT_STAGED', 'EXECUTION_OUTCOME_UNKNOWN',
    'Exactly-once model execution is not claimed.',
    'exactly-once authoritative result publication',
    'GitHub identity, provider identity, and model self-description are not Crown authentication.',
    'Validator capability is structurally absent from this broker contract.',
    'at most one authoritative completed result hash',
    'no two distinct protected messages can use the same AEAD traffic-key/nonce pair',
  ]) if (!doc.includes(required)) hold(`doc missing required binding: ${required}`);

  const secretShapes = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
  ];
  for (const pattern of secretShapes) if (pattern.test(fixtureText)) hold(`fixture contains secret-like material: ${pattern}`);

  process.stdout.write('VOID_BROOD_QUEEN_PRIVATE_BROKER_CONTRACT_V1_PROOF_GREEN\n');
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
