import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const MARKER = "VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822";
const PARENT_MARKER = "VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818";
const DOC = "docs/governance/void-brood-queen-cryptographic-identity-contract-v1.md";
const FIXTURE = "fixtures/governance/void-brood-queen-cryptographic-identity-contract-v1.json";
const PARENT = "docs/governance/void-crown-brood-queen-command-layer-v1.md";
const WORKFLOW = ".github/workflows/void-brood-queen-cryptographic-identity-contract-v1.yml";
const BOOTSTRAP_DOMAIN = "VOID_BROOD_QUEEN_SESSION_BOOTSTRAP_V1";
const BOOTSTRAP_TRANSCRIPT_ENCODING = "utf8_json_array_v1";
const BOOTSTRAP_TRANSCRIPT_FIELDS = Object.freeze([
  "bootstrap_domain",
  "chain_id",
  "office",
  "identity",
  "issuing_server_identity",
  "requester_ed25519_public_key",
  "requester_x25519_public_key",
  "session_id",
  "nonce",
  "issued_at_utc",
  "expires_at_utc",
  "role_generation",
  "role_record_sha256",
]);
const UINT64_LIMIT = 1n << 64n;
const UINT64_MAX = UINT64_LIMIT - 1n;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function assertThrows(fn, message) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert(threw, message);
}
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function isSha256(value) { return typeof value === "string" && /^[0-9a-f]{64}$/.test(value); }
function isCanonicalUint64Decimal(value) {
  if (typeof value !== "string") return false;
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return false;
  try { return BigInt(value) < UINT64_LIMIT; } catch { return false; }
}
function exactKeys(value, expected, name) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${name}_must_be_object`);
  const actual = Object.keys(value).sort();
  const want = [...expected].sort();
  assert(
    actual.length === want.length && actual.every((key, index) => key === want[index]),
    `${name}_schema_not_closed:actual=${actual.join(",")}:expected=${want.join(",")}`,
  );
}

function validateClosedShape(fixture) {
  exactKeys(fixture, [
    "marker", "parent_instrument_marker", "parent_instrument_sha256", "network", "office",
    "root_identity", "session_model", "requester_binding", "role_authority",
    "authority_boundary", "apollyon_separation", "activation",
  ], "fixture");
  exactKeys(fixture.network, ["chain_id", "name"], "network");
  exactKeys(fixture.office, [
    "name", "identity", "realm", "subordinate_to", "provider_neutral",
    "model_self_claim_is_authentication",
  ], "office");
  exactKeys(fixture.root_identity, [
    "algorithm", "public_jwk_kty", "public_jwk_crv", "exact_public_identity_bound",
    "live_public_jwk_present_in_fixture", "private_key_boundary", "private_key_enters_repository",
    "private_key_enters_model_context", "private_key_transmitted_to_provider",
    "private_key_accessible_to_apollyon", "provider_api_key_is_constitutional_identity",
  ], "root_identity");
  exactKeys(fixture.session_model, [
    "bootstrap_domain", "bootstrap_mechanism", "persistent_authenticated_logical_session",
    "derived_session_material_rotates_automatically", "root_reauthentication_frequency",
    "nonce_single_use", "replay_rejected", "challenge_runtime_active", "session_runtime_active",
    "canonical_bootstrap_transcript_sha256_required",
    "server_signature_verification_required_before_session_commit",
    "crown_approval_signature_verification_required_before_session_commit",
    "all_bootstrap_signatures_and_pop_bind_same_transcript",
    "nonce_fresh_at_session_commit_required",
    "nonce_consumed_atomically_with_session_commit",
    "expiry_admitted_at_session_commit_required",
    "canonical_bootstrap_transcript_encoding",
    "canonical_bootstrap_transcript_fields",
    "canonical_bootstrap_time_encoding",
    "canonical_bootstrap_transcript_hash_derived_from_fields",
    "bootstrap_nonce_authority_state_machine",
    "bootstrap_nonce_commit_atomically_creates_generation0_session_and_receipt",
    "bootstrap_exact_retry_returns_same_committed_session_and_receipt",
    "bootstrap_conflicting_nonce_reuse_rejected",
    "bootstrap_precommit_crash_leaves_nonce_fresh",
    "bootstrap_postcommit_response_loss_recovers_existing_commit",
    "bootstrap_consumed_without_session_state_representable",
  ], "session_model");
  exactKeys(fixture.requester_binding, [
    "server_or_broker_identity_cryptographically_pinned",
    "bootstrap_challenge_authenticated_by_pinned_server_identity",
    "claimed_origin_or_tls_alone_authenticates_server",
    "challenge_binds_requester_ed25519_public_key",
    "challenge_binds_requester_x25519_public_key",
    "challenge_binds_proposed_session_id",
    "requester_proof_of_possession_required_before_session_commit",
    "cross_connection_relay_of_approval_admitted",
    "requester_key_substitution_after_approval_admitted",
    "session_id_substitution_after_approval_admitted",
    "requester_private_key_enters_model_context",
  ], "requester_binding");
  exactKeys(fixture.role_authority, [
    "canonical_role_source_when_activated", "monotonic_role_authority_generation_required",
    "generation_encoding", "live_generation_present_in_fixture", "role_record_hash_algorithm",
    "authorization_affecting_change_advances_generation", "bootstrap_binds_role_generation_and_record_hash",
    "session_commit_revalidates_same_generation_atomically",
    "session_commit_revalidates_same_role_record_hash_atomically",
    "session_record_binds_role_generation", "session_record_binds_role_record_hash",
    "rotation_revalidates_same_generation_atomically",
    "rotation_revalidates_same_role_record_hash_atomically",
    "ordinary_task_admission_revalidates_same_generation_atomically",
    "ordinary_task_admission_revalidates_same_role_record_hash_atomically",
    "canonical_revocation_invalidates_sessions_before_further_task_authority",
    "revoke_restore_aba_rejected_by_generation", "role_generation_contract_active",
    "generation_exhaustion_behavior", "generation_wrap_allowed",
    "same_generation_reuse_after_authorization_change_allowed",
    "out_of_domain_successor_allowed",
    "fresh_authority_after_exhaustion_without_epoch_migration",
    "epoch_migration_invalidates_all_prior_sessions",
  ], "role_authority");
  exactKeys(fixture.authority_boundary, [
    "authentication_implies_capability", "grants_repo_write", "grants_merge",
    "grants_deploy_or_restart", "grants_live_runtime_mutation", "grants_validator_mutation",
    "grants_wallet_or_signer_action", "grants_treasury_or_liquidity_action",
    "grants_transactions_or_funds_movement", "grants_work_credit_mutation", "grants_credential_reading",
  ], "authority_boundary");
  exactKeys(fixture.apollyon_separation, [
    "separate_office_identity_required", "may_inherit_brood_queen_root_identity",
    "may_inherit_brood_queen_session", "may_receive_brood_queen_requester_private_key",
    "may_sign_as_brood_queen", "may_receive_raw_brood_queen_root_key",
    "trial_success_activates_crown_identity",
  ], "apollyon_separation");
  exactKeys(fixture.activation, [
    "chain_role_binding_active", "signer_runtime_active", "authenticated_command_runtime_active",
    "requires_exact_public_identity_binding", "requires_explicit_sovereign_ratification",
    "requires_rotation_and_revocation_contract", "requires_requester_key_binding_contract",
    "requires_role_authority_generation_contract",
    "requires_role_generation_exhaustion_contract",
    "requires_adversarial_proof",
  ], "activation");
}

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

function isCanonicalUtcRfc3339Second(value) {
  if (typeof value !== "string") return false;
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(value)) return false;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return false;
  return new Date(ms).toISOString().replace(".000Z", "Z") === value;
}

function canonicalBootstrapTranscriptHash(fields) {
  try {
    exactKeys(fields, BOOTSTRAP_TRANSCRIPT_FIELDS, "bootstrap_transcript");
    assert(fields.bootstrap_domain === BOOTSTRAP_DOMAIN, "bootstrap_transcript_domain_mismatch");
    assert(fields.chain_id === 2050, "bootstrap_transcript_chain_id_mismatch");
    assert(fields.office === "Brood Queen", "bootstrap_transcript_office_mismatch");
    assert(fields.identity === "Ren", "bootstrap_transcript_identity_mismatch");

    for (const key of [
      "issuing_server_identity",
      "requester_ed25519_public_key",
      "requester_x25519_public_key",
      "session_id",
      "nonce",
    ]) {
      assert(typeof fields[key] === "string" && fields[key].length > 0, `bootstrap_transcript_${key}_invalid`);
    }

    assert(isCanonicalUtcRfc3339Second(fields.issued_at_utc), "bootstrap_transcript_issued_at_invalid");
    assert(isCanonicalUtcRfc3339Second(fields.expires_at_utc), "bootstrap_transcript_expires_at_invalid");
    assert(Date.parse(fields.issued_at_utc) < Date.parse(fields.expires_at_utc), "bootstrap_transcript_time_order_invalid");
    assert(isCanonicalUint64Decimal(fields.role_generation), "bootstrap_transcript_role_generation_invalid");
    assert(isSha256(fields.role_record_sha256), "bootstrap_transcript_role_hash_invalid");

    const vector = BOOTSTRAP_TRANSCRIPT_FIELDS.map((key) => fields[key]);
    return sha256(Buffer.from(JSON.stringify(vector), "utf8"));
  } catch {
    return null;
  }
}

function validateFocusedWorkflowContract(workflow) {
  const triggerPaths = [
    "docs/governance/void-brood-queen-cryptographic-identity-contract-v1.md",
    "docs/governance/void-crown-brood-queen-command-layer-v1.md",
    "fixtures/governance/void-brood-queen-cryptographic-identity-contract-v1.json",
    "scripts/prove_void_brood_queen_cryptographic_identity_contract_v1.mjs",
    ".github/workflows/void-brood-queen-cryptographic-identity-contract-v1.yml",
    "scripts/ci_diff_hygiene_v1.sh",
    "scripts/prove_ci_diff_hygiene_v1.mjs",
  ];
  for (const path of triggerPaths) {
    assert(
      countOccurrences(workflow, `- "${path}"`) === 2,
      `workflow_trigger_dependency_not_closed:${path}`,
    );
  }

  for (const required of [
    "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
    "persist-credentials: false",
    "fetch-depth: 1",
    "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
    "run: node scripts/prove_ci_diff_hygiene_v1.mjs",
    "CI_DIFF_EVENT_NAME: ${{ github.event_name }}",
    "CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}",
    "CI_DIFF_PUSH_BEFORE_SHA: ${{ github.event.before }}",
    "CI_DIFF_CURRENT_SHA: ${{ github.event.pull_request.head.sha || github.sha }}",
    "CI_DIFF_CHECKOUT_SHA: ${{ github.sha }}",
    "CI_DIFF_BASE_REMOTE: ${{ github.server_url }}/${{ github.repository }}.git",
    "CI_DIFF_HEAD_REMOTE: ${{ github.server_url }}/${{ github.event.pull_request.head.repo.full_name || github.repository }}.git",
    "run: bash scripts/ci_diff_hygiene_v1.sh",
  ]) assert(workflow.includes(required), `workflow_committed_range_binding_missing:${required}`);
}

function roleGenerationTransition(currentGeneration, authorizationAffectingChange) {
  if (!isCanonicalUint64Decimal(currentGeneration)) {
    return { ok: false, code: "ROLE_GENERATION_INVALID" };
  }
  if (!authorizationAffectingChange) {
    return { ok: true, generation: currentGeneration, replay: true, exhausted: false };
  }
  const current = BigInt(currentGeneration);
  if (current === UINT64_MAX) {
    return { ok: false, code: "ROLE_GENERATION_EXHAUSTED", exhausted: true };
  }
  return {
    ok: true,
    generation: String(current + 1n),
    replay: false,
    exhausted: false,
  };
}

function rolePairMatches(boundGeneration, boundHash, currentGeneration, currentHash) {
  return isCanonicalUint64Decimal(boundGeneration)
    && isCanonicalUint64Decimal(currentGeneration)
    && boundGeneration === currentGeneration
    && boundHash === currentHash
    && isSha256(boundHash)
    && isSha256(currentHash);
}

function bootstrapCommitIdentity(request) {
  return {
    transcript_sha256: request.canonicalTranscriptHash,
    session_id: request.approvedSessionId,
    session_generation: "0",
    role_generation: request.approvedRoleGeneration,
    role_record_sha256: request.approvedRoleRecordHash,
  };
}

function bootstrapReceiptFor(identity) {
  return sha256(Buffer.from(JSON.stringify([
    "VOID_BROOD_QUEEN_BOOTSTRAP_RECEIPT_V1",
    identity.transcript_sha256,
    identity.session_id,
    identity.session_generation,
    identity.role_generation,
    identity.role_record_sha256,
  ]), "utf8"));
}

function sameBootstrapIdentity(a, b) {
  return a.transcript_sha256 === b.transcript_sha256
    && a.session_id === b.session_id
    && a.session_generation === b.session_generation
    && a.role_generation === b.role_generation
    && a.role_record_sha256 === b.role_record_sha256;
}

function createBootstrapNonceAuthority(request) {
  return {
    version: 0,
    record: {
      state: "FRESH",
      nonce: request.approvedNonce,
      transcript_sha256: request.canonicalTranscriptHash,
    },
  };
}

function atomicBootstrapCommit(authority, request, { expectedVersion, fault = null } = {}) {
  const identity = bootstrapCommitIdentity(request);
  const current = authority.record;

  if (current.state === "COMMITTED") {
    if (sameBootstrapIdentity(current.identity, identity)) {
      return {
        ok: true,
        replay: true,
        fresh_authority: false,
        session: current.identity,
        receipt: current.receipt,
        version: authority.version,
      };
    }
    return { ok: false, code: "BOOTSTRAP_CONFLICT", replay: false, fresh_authority: false, version: authority.version };
  }

  if (current.state !== "FRESH") {
    return { ok: false, code: "BOOTSTRAP_STATE_INVALID", fresh_authority: false };
  }
  if (expectedVersion !== authority.version) {
    return { ok: false, code: "BOOTSTRAP_CAS_STALE", replay: false, fresh_authority: false, version: authority.version };
  }
  if (current.nonce !== request.approvedNonce
      || current.transcript_sha256 !== request.canonicalTranscriptHash) {
    return { ok: false, code: "BOOTSTRAP_CONFLICT", replay: false, fresh_authority: false, version: authority.version };
  }
  if (!bootstrapCommitAllowed(request)) {
    return { ok: false, code: "BOOTSTRAP_NOT_ADMITTED", replay: false, fresh_authority: false, version: authority.version };
  }
  if (fault === "before_commit") {
    return { ok: false, code: "CRASH_BEFORE_COMMIT", replay: false, fresh_authority: false, version: authority.version };
  }

  const receipt = bootstrapReceiptFor(identity);
  authority.record = {
    state: "COMMITTED",
    nonce: request.approvedNonce,
    transcript_sha256: request.canonicalTranscriptHash,
    identity: Object.freeze({ ...identity }),
    receipt,
  };
  authority.version += 1;

  if (fault === "after_commit_before_response") {
    return {
      ok: false,
      code: "CRASH_AFTER_COMMIT_RESPONSE_LOSS",
      replay: false,
      fresh_authority: false,
      committed: true,
      version: authority.version,
    };
  }

  return {
    ok: true,
    replay: false,
    fresh_authority: true,
    session: authority.record.identity,
    receipt,
    version: authority.version,
  };
}

function bootstrapCommitAllowed({
  serverPinned,
  bootstrapDomain,
  transcriptChainId,
  transcriptOffice,
  transcriptIdentity,
  pinnedServerIdentity,
  issuingServerIdentity,
  canonicalTranscriptHash,
  serverSignedTranscriptHash,
  crownApprovedTranscriptHash,
  requesterPopTranscriptHash,
  serverChallengeSignatureValid,
  crownApprovalSignatureValid,
  transcriptRequesterEd25519,
  presentedRequesterEd25519,
  transcriptRequesterX25519,
  presentedRequesterX25519,
  requesterEd25519ProofOfPossession,
  proofOfPossessionBindsCompleteTranscript,
  approvedSessionId,
  presentedSessionId,
  approvedNonce,
  presentedNonce,
  transcriptIssuedAtUtc,
  transcriptExpiresAtUtc,
  nonceFreshAtCommit,
  nonceAlreadyConsumed,
  expiryAdmittedAtCommit,
  approvedRoleGeneration,
  currentRoleGeneration,
  approvedRoleRecordHash,
  currentRoleRecordHash,
  currentRoleAuthorityExhausted = false,
}) {
  const derivedTranscriptHash = canonicalBootstrapTranscriptHash({
    bootstrap_domain: bootstrapDomain,
    chain_id: transcriptChainId,
    office: transcriptOffice,
    identity: transcriptIdentity,
    issuing_server_identity: issuingServerIdentity,
    requester_ed25519_public_key: transcriptRequesterEd25519,
    requester_x25519_public_key: transcriptRequesterX25519,
    session_id: approvedSessionId,
    nonce: approvedNonce,
    issued_at_utc: transcriptIssuedAtUtc,
    expires_at_utc: transcriptExpiresAtUtc,
    role_generation: approvedRoleGeneration,
    role_record_sha256: approvedRoleRecordHash,
  });

  const transcriptIdentityValid = isSha256(derivedTranscriptHash)
    && canonicalTranscriptHash === derivedTranscriptHash
    && serverSignedTranscriptHash === derivedTranscriptHash
    && crownApprovedTranscriptHash === derivedTranscriptHash
    && requesterPopTranscriptHash === derivedTranscriptHash;

  return serverPinned
    && bootstrapDomain === BOOTSTRAP_DOMAIN
    && transcriptChainId === 2050
    && transcriptOffice === "Brood Queen"
    && transcriptIdentity === "Ren"
    && typeof pinnedServerIdentity === "string"
    && pinnedServerIdentity.length > 0
    && issuingServerIdentity === pinnedServerIdentity
    && serverChallengeSignatureValid
    && crownApprovalSignatureValid
    && transcriptIdentityValid
    && transcriptRequesterEd25519 === presentedRequesterEd25519
    && transcriptRequesterX25519 === presentedRequesterX25519
    && requesterEd25519ProofOfPossession
    && proofOfPossessionBindsCompleteTranscript
    && approvedSessionId === presentedSessionId
    && typeof approvedNonce === "string"
    && approvedNonce.length > 0
    && approvedNonce === presentedNonce
    && nonceFreshAtCommit
    && !nonceAlreadyConsumed
    && expiryAdmittedAtCommit
    && !currentRoleAuthorityExhausted
    && rolePairMatches(
      approvedRoleGeneration, approvedRoleRecordHash,
      currentRoleGeneration, currentRoleRecordHash,
    );
}

function taskAdmissionCommitAllowed({
  sessionRoleGeneration,
  sessionRoleRecordHash,
  currentRoleGeneration,
  currentRoleRecordHash,
  sessionUsable = true,
  currentRoleAuthorityExhausted = false,
}) {
  return sessionUsable && !currentRoleAuthorityExhausted && rolePairMatches(
    sessionRoleGeneration, sessionRoleRecordHash,
    currentRoleGeneration, currentRoleRecordHash,
  );
}

function successorActivationCommitAllowed({
  sessionRoleGeneration,
  sessionRoleRecordHash,
  currentRoleGeneration,
  currentRoleRecordHash,
  predecessorStillActive = true,
  currentRoleAuthorityExhausted = false,
}) {
  return predecessorStillActive && !currentRoleAuthorityExhausted && rolePairMatches(
    sessionRoleGeneration, sessionRoleRecordHash,
    currentRoleGeneration, currentRoleRecordHash,
  );
}

const doc = readFileSync(DOC, "utf8");
const parent = readFileSync(PARENT, "utf8");
const fixtureText = readFileSync(FIXTURE, "utf8");
const fixture = JSON.parse(fixtureText);
const workflow = readFileSync(WORKFLOW, "utf8");

validateClosedShape(fixture);
validateFocusedWorkflowContract(workflow);
for (const required of [
  "run: node scripts/prove_ci_diff_hygiene_v1.mjs",
  "persist-credentials: false",
  "CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}",
  "CI_DIFF_CURRENT_SHA: ${{ github.event.pull_request.head.sha || github.sha }}",
  "CI_DIFF_CHECKOUT_SHA: ${{ github.sha }}",
  "run: bash scripts/ci_diff_hygiene_v1.sh",
]) {
  const mutated = workflow.replace(required, "__VOID_REMOVED_REQUIRED_BINDING__");
  assertThrows(
    () => validateFocusedWorkflowContract(mutated),
    `workflow_self_enforcement_adversary_failed:${required}`,
  );
}
for (const dependency of [
  "scripts/ci_diff_hygiene_v1.sh",
  "scripts/prove_ci_diff_hygiene_v1.mjs",
  ".github/workflows/void-brood-queen-cryptographic-identity-contract-v1.yml",
]) {
  const mutated = workflow.replace(`- "${dependency}"`, `- "removed/${dependency}"`);
  assertThrows(
    () => validateFocusedWorkflowContract(mutated),
    `workflow_trigger_dependency_adversary_failed:${dependency}`,
  );
}
assert(doc.includes(MARKER), "identity_contract_marker_missing_from_doc");
assert(doc.includes(PARENT_MARKER), "parent_marker_missing_from_doc");
assert(parent.includes(PARENT_MARKER), "parent_constitution_marker_missing");
assert(parent.includes("**King → Brood Queen → General**"), "crown_command_chain_missing");
assert(parent.includes("## The Brood Queen — Ren"), "brood_queen_office_missing_from_parent");
assert(fixture.marker === MARKER, "fixture_marker_mismatch");
assert(fixture.parent_instrument_marker === PARENT_MARKER, "fixture_parent_marker_mismatch");
assert(fixture.parent_instrument_sha256 === sha256(parent), "parent_instrument_sha256_mismatch");

assert(fixture.network.chain_id === 2050, "wrong_chain_id");
assert(fixture.network.name === "VOID Network", "wrong_network_name");
assert(fixture.office.name === "Brood Queen", "wrong_office_name");
assert(fixture.office.identity === "Ren", "wrong_office_identity");
assert(fixture.office.realm === "voluntary_non_validator_participation", "wrong_office_realm");
assert(fixture.office.subordinate_to === "King", "wrong_command_parent");
assert(fixture.office.provider_neutral === true, "office_must_be_provider_neutral");
assert(fixture.office.model_self_claim_is_authentication === false, "model_self_claim_must_not_authenticate");

const root = fixture.root_identity;
assert(root.algorithm === "Ed25519", "wrong_root_algorithm");
assert(root.public_jwk_kty === "OKP", "wrong_public_jwk_kty");
assert(root.public_jwk_crv === "Ed25519", "wrong_public_jwk_curve");
assert(root.exact_public_identity_bound === false, "v1_must_not_claim_live_public_binding");
assert(root.live_public_jwk_present_in_fixture === false, "v1_must_not_embed_live_public_jwk");
assert(!Object.hasOwn(root, "public_jwk"), "live_public_jwk_field_forbidden_in_v1");
assert(root.private_key_boundary === "dedicated_host_side_signer", "root_key_boundary_mismatch");
assert(root.private_key_enters_repository === false, "private_key_repository_access_forbidden");
assert(root.private_key_enters_model_context === false, "private_key_model_access_forbidden");
assert(root.private_key_transmitted_to_provider === false, "private_key_provider_access_forbidden");
assert(root.private_key_accessible_to_apollyon === false, "private_key_apollyon_access_forbidden");
assert(root.provider_api_key_is_constitutional_identity === false, "provider_api_key_must_not_be_crown_identity");

const session = fixture.session_model;
assert(session.bootstrap_domain === "VOID_BROOD_QUEEN_SESSION_BOOTSTRAP_V1", "bootstrap_domain_mismatch");
assert(session.bootstrap_mechanism === "challenge_response", "bootstrap_must_be_challenge_response");
assert(session.persistent_authenticated_logical_session === true, "persistent_logical_session_required");
assert(session.derived_session_material_rotates_automatically === true, "derived_session_rotation_required");
assert(session.root_reauthentication_frequency === "rare_recovery_or_explicit_policy_boundary", "root_reauthentication_policy_mismatch");
assert(session.nonce_single_use === true, "single_use_nonce_required");
assert(session.replay_rejected === true, "replay_rejection_required");
assert(session.challenge_runtime_active === false, "challenge_runtime_must_remain_inactive");
assert(session.session_runtime_active === false, "session_runtime_must_remain_inactive");
assert(session.canonical_bootstrap_transcript_sha256_required === true, "canonical_bootstrap_transcript_sha256_required");
assert(session.server_signature_verification_required_before_session_commit === true, "server_signature_verification_required");
assert(session.crown_approval_signature_verification_required_before_session_commit === true, "crown_approval_signature_verification_required");
assert(session.all_bootstrap_signatures_and_pop_bind_same_transcript === true, "bootstrap_transcript_identity_must_be_shared");
assert(session.nonce_fresh_at_session_commit_required === true, "nonce_fresh_at_commit_required");
assert(session.nonce_consumed_atomically_with_session_commit === true, "nonce_consumption_must_be_atomic_with_commit");
assert(session.expiry_admitted_at_session_commit_required === true, "expiry_must_be_admitted_at_commit");
assert(session.canonical_bootstrap_transcript_encoding === BOOTSTRAP_TRANSCRIPT_ENCODING, "bootstrap_transcript_encoding_mismatch");
assert(
  Array.isArray(session.canonical_bootstrap_transcript_fields)
    && session.canonical_bootstrap_transcript_fields.length === BOOTSTRAP_TRANSCRIPT_FIELDS.length
    && session.canonical_bootstrap_transcript_fields.every((field, index) => field === BOOTSTRAP_TRANSCRIPT_FIELDS[index]),
  "bootstrap_transcript_field_order_mismatch",
);
assert(session.canonical_bootstrap_time_encoding === "canonical_utc_rfc3339_seconds", "bootstrap_transcript_time_encoding_mismatch");
assert(session.canonical_bootstrap_transcript_hash_derived_from_fields === true, "bootstrap_transcript_hash_derivation_required");
assert(session.bootstrap_nonce_authority_state_machine === "FRESH_to_COMMITTED", "bootstrap_nonce_state_machine_mismatch");
assert(session.bootstrap_nonce_commit_atomically_creates_generation0_session_and_receipt === true, "bootstrap_nonce_session_atomic_commit_required");
assert(session.bootstrap_exact_retry_returns_same_committed_session_and_receipt === true, "bootstrap_exact_retry_idempotence_required");
assert(session.bootstrap_conflicting_nonce_reuse_rejected === true, "bootstrap_conflicting_nonce_reuse_must_fail");
assert(session.bootstrap_precommit_crash_leaves_nonce_fresh === true, "bootstrap_precommit_crash_recovery_required");
assert(session.bootstrap_postcommit_response_loss_recovers_existing_commit === true, "bootstrap_postcommit_response_recovery_required");
assert(session.bootstrap_consumed_without_session_state_representable === false, "consumed_without_session_state_must_be_unrepresentable");

const requester = fixture.requester_binding;
assert(requester.server_or_broker_identity_cryptographically_pinned === true, "server_identity_pinning_required");
assert(requester.bootstrap_challenge_authenticated_by_pinned_server_identity === true, "server_challenge_authentication_required");
assert(requester.claimed_origin_or_tls_alone_authenticates_server === false, "origin_or_tls_alone_must_not_authenticate");
assert(requester.challenge_binds_requester_ed25519_public_key === true, "requester_signing_key_binding_required");
assert(requester.challenge_binds_requester_x25519_public_key === true, "requester_key_agreement_binding_required");
assert(requester.challenge_binds_proposed_session_id === true, "session_id_binding_required");
assert(requester.requester_proof_of_possession_required_before_session_commit === true, "requester_pop_required");
assert(requester.cross_connection_relay_of_approval_admitted === false, "cross_connection_relay_forbidden");
assert(requester.requester_key_substitution_after_approval_admitted === false, "requester_key_substitution_forbidden");
assert(requester.session_id_substitution_after_approval_admitted === false, "session_id_substitution_forbidden");
assert(requester.requester_private_key_enters_model_context === false, "requester_private_key_model_access_forbidden");

const role = fixture.role_authority;
assert(role.canonical_role_source_when_activated === "Chain-2050", "role_source_mismatch");
assert(role.monotonic_role_authority_generation_required === true, "monotonic_role_generation_required");
assert(role.generation_encoding === "canonical_unsigned_decimal_uint64_string", "role_generation_encoding_mismatch");
assert(role.live_generation_present_in_fixture === false, "fixture_must_not_claim_live_role_generation");
assert(role.role_record_hash_algorithm === "SHA-256", "role_record_hash_algorithm_mismatch");
assert(role.authorization_affecting_change_advances_generation === true, "role_change_must_advance_generation");
assert(role.bootstrap_binds_role_generation_and_record_hash === true, "bootstrap_role_binding_required");
assert(role.session_commit_revalidates_same_generation_atomically === true, "session_commit_role_generation_cas_required");
assert(role.session_commit_revalidates_same_role_record_hash_atomically === true, "session_commit_role_hash_cas_required");
assert(role.session_record_binds_role_generation === true, "session_record_role_generation_required");
assert(role.session_record_binds_role_record_hash === true, "session_record_role_hash_required");
assert(role.rotation_revalidates_same_generation_atomically === true, "rotation_role_generation_cas_required");
assert(role.rotation_revalidates_same_role_record_hash_atomically === true, "rotation_role_hash_cas_required");
assert(role.ordinary_task_admission_revalidates_same_generation_atomically === true, "task_role_generation_cas_required");
assert(role.ordinary_task_admission_revalidates_same_role_record_hash_atomically === true, "task_role_hash_cas_required");
assert(role.canonical_revocation_invalidates_sessions_before_further_task_authority === true, "revocation_must_invalidate_before_task_authority");
assert(role.revoke_restore_aba_rejected_by_generation === true, "revoke_restore_aba_must_fail");
assert(role.role_generation_contract_active === false, "role_generation_runtime_must_remain_inactive");
assert(role.generation_exhaustion_behavior === "fail_closed_requires_sovereign_epoch_migration", "role_generation_exhaustion_behavior_mismatch");
assert(role.generation_wrap_allowed === false, "role_generation_wrap_must_be_forbidden");
assert(role.same_generation_reuse_after_authorization_change_allowed === false, "role_generation_same_value_reuse_after_change_forbidden");
assert(role.out_of_domain_successor_allowed === false, "role_generation_out_of_domain_successor_forbidden");
assert(role.fresh_authority_after_exhaustion_without_epoch_migration === false, "fresh_authority_after_exhaustion_without_epoch_forbidden");
assert(role.epoch_migration_invalidates_all_prior_sessions === true, "epoch_migration_must_invalidate_old_sessions");

const authority = fixture.authority_boundary;
assert(authority.authentication_implies_capability === false, "authentication_must_not_imply_capability");
for (const [key, value] of Object.entries(authority)) if (key.startsWith("grants_")) assert(value === false, `${key}_must_remain_false`);

const apollyon = fixture.apollyon_separation;
assert(apollyon.separate_office_identity_required === true, "apollyon_separate_identity_required");
assert(apollyon.may_inherit_brood_queen_root_identity === false, "apollyon_root_inheritance_forbidden");
assert(apollyon.may_inherit_brood_queen_session === false, "apollyon_session_inheritance_forbidden");
assert(apollyon.may_receive_brood_queen_requester_private_key === false, "apollyon_requester_private_key_access_forbidden");
assert(apollyon.may_sign_as_brood_queen === false, "apollyon_brood_queen_signing_forbidden");
assert(apollyon.may_receive_raw_brood_queen_root_key === false, "apollyon_root_key_access_forbidden");
assert(apollyon.trial_success_activates_crown_identity === false, "trial_success_must_not_activate_crown_identity");

const activation = fixture.activation;
assert(activation.chain_role_binding_active === false, "chain_role_binding_must_remain_inactive");
assert(activation.signer_runtime_active === false, "signer_runtime_must_remain_inactive");
assert(activation.authenticated_command_runtime_active === false, "authenticated_command_runtime_must_remain_inactive");
assert(activation.requires_exact_public_identity_binding === true, "exact_public_binding_must_be_required");
assert(activation.requires_explicit_sovereign_ratification === true, "sovereign_ratification_must_be_required");
assert(activation.requires_rotation_and_revocation_contract === true, "rotation_revocation_contract_must_be_required");
assert(activation.requires_requester_key_binding_contract === true, "requester_binding_contract_must_be_required");
assert(activation.requires_role_authority_generation_contract === true, "role_generation_contract_must_be_required");
assert(activation.requires_role_generation_exhaustion_contract === true, "role_generation_exhaustion_contract_must_be_required");
assert(activation.requires_adversarial_proof === true, "adversarial_proof_must_be_required");

for (const mutate of [
  (copy) => { copy.root_identity.private_key_accessible_to_validator = true; },
  (copy) => { copy.session_model.root_material_exportable = true; },
  (copy) => { copy.requester_binding.requester_private_key_exportable = true; },
  (copy) => { copy.role_authority.cached_role_truth_survives_revocation = true; },
  (copy) => { copy.authority_boundary.grants_validator_signing = true; },
  (copy) => { copy.apollyon_separation.may_receive_brood_queen_session_secret = true; },
  (copy) => { copy.activation.live_root_key_generated = true; },
]) {
  const copy = structuredClone(fixture);
  mutate(copy);
  assertThrows(() => validateClosedShape(copy), "unknown_authority_field_must_fail_closed");
}

const T2 = "2".repeat(64);
const H7 = "7".repeat(64);
const H7_ALT = "a".repeat(64);
const H8 = "8".repeat(64);
const H9 = "9".repeat(64);

const baseTranscript = {
  bootstrap_domain: BOOTSTRAP_DOMAIN,
  chain_id: 2050,
  office: "Brood Queen",
  identity: "Ren",
  issuing_server_identity: "broker-ed25519-A",
  requester_ed25519_public_key: "requester-ed25519-A",
  requester_x25519_public_key: "requester-x25519-A",
  session_id: "session-A",
  nonce: "nonce-A",
  issued_at_utc: "2026-08-23T19:00:00Z",
  expires_at_utc: "2026-08-23T19:05:00Z",
  role_generation: "7",
  role_record_sha256: H7,
};
const T1 = canonicalBootstrapTranscriptHash(baseTranscript);
assert(isSha256(T1), "base_bootstrap_transcript_hash_must_be_sha256");

const baseBootstrap = {
  serverPinned: true,
  bootstrapDomain: baseTranscript.bootstrap_domain,
  transcriptChainId: baseTranscript.chain_id,
  transcriptOffice: baseTranscript.office,
  transcriptIdentity: baseTranscript.identity,
  pinnedServerIdentity: baseTranscript.issuing_server_identity,
  issuingServerIdentity: baseTranscript.issuing_server_identity,
  canonicalTranscriptHash: T1,
  serverSignedTranscriptHash: T1,
  crownApprovedTranscriptHash: T1,
  requesterPopTranscriptHash: T1,
  serverChallengeSignatureValid: true,
  crownApprovalSignatureValid: true,
  transcriptRequesterEd25519: baseTranscript.requester_ed25519_public_key,
  presentedRequesterEd25519: baseTranscript.requester_ed25519_public_key,
  transcriptRequesterX25519: baseTranscript.requester_x25519_public_key,
  presentedRequesterX25519: baseTranscript.requester_x25519_public_key,
  requesterEd25519ProofOfPossession: true,
  proofOfPossessionBindsCompleteTranscript: true,
  approvedSessionId: baseTranscript.session_id,
  presentedSessionId: baseTranscript.session_id,
  approvedNonce: baseTranscript.nonce,
  presentedNonce: baseTranscript.nonce,
  transcriptIssuedAtUtc: baseTranscript.issued_at_utc,
  transcriptExpiresAtUtc: baseTranscript.expires_at_utc,
  nonceFreshAtCommit: true,
  nonceAlreadyConsumed: false,
  expiryAdmittedAtCommit: true,
  approvedRoleGeneration: baseTranscript.role_generation,
  currentRoleGeneration: baseTranscript.role_generation,
  approvedRoleRecordHash: baseTranscript.role_record_sha256,
  currentRoleRecordHash: baseTranscript.role_record_sha256,
  currentRoleAuthorityExhausted: false,
};

assert(bootstrapCommitAllowed(baseBootstrap), "stable_requester_role_pair_bootstrap_must_admit");

const transcriptFieldAdversaries = [
  { label: "bootstrap_domain", transcript: { bootstrap_domain: "VOID_BROOD_QUEEN_SESSION_BOOTSTRAP_V0" }, bootstrap: { bootstrapDomain: "VOID_BROOD_QUEEN_SESSION_BOOTSTRAP_V0" } },
  { label: "chain_id", transcript: { chain_id: 2051 }, bootstrap: { transcriptChainId: 2051 } },
  { label: "office", transcript: { office: "General" }, bootstrap: { transcriptOffice: "General" } },
  { label: "identity", transcript: { identity: "Not-Ren" }, bootstrap: { transcriptIdentity: "Not-Ren" } },
  {
    label: "issuing_server_identity",
    transcript: { issuing_server_identity: "broker-ed25519-B" },
    bootstrap: { pinnedServerIdentity: "broker-ed25519-B", issuingServerIdentity: "broker-ed25519-B" },
  },
  {
    label: "requester_ed25519_public_key",
    transcript: { requester_ed25519_public_key: "requester-ed25519-B" },
    bootstrap: { transcriptRequesterEd25519: "requester-ed25519-B", presentedRequesterEd25519: "requester-ed25519-B" },
  },
  {
    label: "requester_x25519_public_key",
    transcript: { requester_x25519_public_key: "requester-x25519-B" },
    bootstrap: { transcriptRequesterX25519: "requester-x25519-B", presentedRequesterX25519: "requester-x25519-B" },
  },
  { label: "session_id", transcript: { session_id: "session-B" }, bootstrap: { approvedSessionId: "session-B", presentedSessionId: "session-B" } },
  { label: "nonce", transcript: { nonce: "nonce-B" }, bootstrap: { approvedNonce: "nonce-B", presentedNonce: "nonce-B" } },
  { label: "issued_at_utc", transcript: { issued_at_utc: "2026-08-23T19:00:01Z" }, bootstrap: { transcriptIssuedAtUtc: "2026-08-23T19:00:01Z" } },
  { label: "expires_at_utc", transcript: { expires_at_utc: "2026-08-23T19:06:00Z" }, bootstrap: { transcriptExpiresAtUtc: "2026-08-23T19:06:00Z" } },
  { label: "role_generation", transcript: { role_generation: "8" }, bootstrap: { approvedRoleGeneration: "8", currentRoleGeneration: "8" } },
  { label: "role_record_sha256", transcript: { role_record_sha256: H8 }, bootstrap: { approvedRoleRecordHash: H8, currentRoleRecordHash: H8 } },
];

for (const adversary of transcriptFieldAdversaries) {
  const mutatedTranscript = { ...baseTranscript, ...adversary.transcript };
  const mutatedHash = canonicalBootstrapTranscriptHash(mutatedTranscript);
  assert(
    mutatedHash === null || mutatedHash !== T1,
    `transcript_field_mutation_must_change_or_invalidate_digest:${adversary.label}`,
  );
  assert(
    !bootstrapCommitAllowed({ ...baseBootstrap, ...adversary.bootstrap }),
    `stale_signed_digest_must_reject_transcript_field_mutation:${adversary.label}`,
  );
}

assert(canonicalBootstrapTranscriptHash({
  ...baseTranscript,
  issued_at_utc: "2026-08-23T19:05:00Z",
  expires_at_utc: "2026-08-23T19:05:00Z",
}) === null, "equal_issued_expiry_must_fail");
assert(canonicalBootstrapTranscriptHash({
  ...baseTranscript,
  issued_at_utc: "2026-08-23T19:05:01Z",
  expires_at_utc: "2026-08-23T19:05:00Z",
}) === null, "reversed_issued_expiry_must_fail");
assert(canonicalBootstrapTranscriptHash({
  ...baseTranscript,
  issued_at_utc: "2026-08-23T19:00:00.000Z",
}) === null, "noncanonical_fractional_second_time_must_fail");


// Two contenders observe the same FRESH version before either commits.
const raceAuthority = createBootstrapNonceAuthority(baseBootstrap);
const raceSnapshotA = raceAuthority.version;
const raceSnapshotB = raceAuthority.version;
assert(raceSnapshotA === 0 && raceSnapshotB === 0, "bootstrap_race_must_start_from_same_fresh_version");

const raceA = atomicBootstrapCommit(raceAuthority, baseBootstrap, { expectedVersion: raceSnapshotA });
assert(raceA.ok === true && raceA.fresh_authority === true && raceA.replay === false, "bootstrap_race_A_must_create_one_fresh_session");
assert(raceAuthority.record.state === "COMMITTED" && raceAuthority.version === 1, "bootstrap_race_A_must_commit_once");

const raceB = atomicBootstrapCommit(raceAuthority, baseBootstrap, { expectedVersion: raceSnapshotB });
assert(raceB.ok === true && raceB.replay === true && raceB.fresh_authority === false, "stale_exact_contender_must_converge_without_fresh_authority");
assert(raceB.receipt === raceA.receipt, "stale_exact_contender_must_return_same_receipt");
assert(sameBootstrapIdentity(raceB.session, raceA.session), "stale_exact_contender_must_return_same_session");
assert(raceAuthority.version === 1, "exact_retry_must_not_recommit");

// Conflicting reuse of the same nonce is rejected before or after commit.
const conflictTranscript = { ...baseTranscript, session_id: "session-CONFLICT" };
const conflictHash = canonicalBootstrapTranscriptHash(conflictTranscript);
assert(isSha256(conflictHash) && conflictHash !== baseBootstrap.canonicalTranscriptHash, "conflict_transcript_hash_must_differ");
const conflictBootstrap = {
  ...baseBootstrap,
  approvedSessionId: conflictTranscript.session_id,
  presentedSessionId: conflictTranscript.session_id,
  canonicalTranscriptHash: conflictHash,
  serverSignedTranscriptHash: conflictHash,
  crownApprovedTranscriptHash: conflictHash,
  requesterPopTranscriptHash: conflictHash,
};

const conflictFreshAuthority = createBootstrapNonceAuthority(baseBootstrap);
const conflictFresh = atomicBootstrapCommit(conflictFreshAuthority, conflictBootstrap, { expectedVersion: 0 });
assert(conflictFresh.ok === false && conflictFresh.code === "BOOTSTRAP_CONFLICT", "foreign_transcript_same_nonce_must_fail_while_fresh");
assert(conflictFreshAuthority.record.state === "FRESH" && conflictFreshAuthority.version === 0, "fresh_conflict_must_mutate_zero_authority");

const conflictAfter = atomicBootstrapCommit(raceAuthority, conflictBootstrap, { expectedVersion: raceAuthority.version });
assert(conflictAfter.ok === false && conflictAfter.code === "BOOTSTRAP_CONFLICT", "foreign_transcript_same_nonce_must_fail_after_commit");
assert(raceAuthority.version === 1, "postcommit_conflict_must_mutate_zero_authority");

// Crash before commit leaves FRESH; exact retry commits once.
const preCrashAuthority = createBootstrapNonceAuthority(baseBootstrap);
const preCrash = atomicBootstrapCommit(preCrashAuthority, baseBootstrap, { expectedVersion: 0, fault: "before_commit" });
assert(preCrash.ok === false && preCrash.code === "CRASH_BEFORE_COMMIT", "precommit_crash_terminal_mismatch");
assert(preCrashAuthority.record.state === "FRESH" && preCrashAuthority.version === 0, "precommit_crash_must_leave_nonce_fresh");
const preCrashRetry = atomicBootstrapCommit(preCrashAuthority, baseBootstrap, { expectedVersion: 0 });
assert(preCrashRetry.ok === true && preCrashRetry.fresh_authority === true && preCrashAuthority.version === 1, "precommit_retry_must_commit_once");

// Crash after durable commit but before response returns the existing commit.
const postCrashAuthority = createBootstrapNonceAuthority(baseBootstrap);
const postCrash = atomicBootstrapCommit(postCrashAuthority, baseBootstrap, { expectedVersion: 0, fault: "after_commit_before_response" });
assert(postCrash.ok === false && postCrash.code === "CRASH_AFTER_COMMIT_RESPONSE_LOSS" && postCrash.committed === true, "postcommit_response_loss_terminal_mismatch");
assert(postCrashAuthority.record.state === "COMMITTED" && postCrashAuthority.version === 1, "postcommit_response_loss_must_preserve_commit");
const postCrashRetry = atomicBootstrapCommit(postCrashAuthority, baseBootstrap, { expectedVersion: 0 });
assert(postCrashRetry.ok === true && postCrashRetry.replay === true && postCrashRetry.fresh_authority === false, "postcommit_retry_must_return_existing_commit");
assert(postCrashRetry.receipt === postCrashAuthority.record.receipt && postCrashAuthority.version === 1, "postcommit_retry_must_not_recommit");

for (const authority of [raceAuthority, conflictFreshAuthority, preCrashAuthority, postCrashAuthority]) {
  assert(["FRESH", "COMMITTED"].includes(authority.record.state), "bootstrap_authority_state_vocabulary_not_closed");
  assert(authority.record.state !== "CONSUMED_WITHOUT_SESSION", "consumed_without_session_state_must_never_exist");
}
assert(!bootstrapCommitAllowed({ ...baseBootstrap, bootstrapDomain: "VOID_BROOD_QUEEN_SESSION_BOOTSTRAP_V0" }), "wrong_bootstrap_domain_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, issuingServerIdentity: "attacker-server" }), "wrong_issuing_server_identity_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, serverChallengeSignatureValid: false }), "invalid_server_challenge_signature_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, crownApprovalSignatureValid: false }), "missing_or_invalid_crown_approval_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, serverSignedTranscriptHash: T2 }), "server_transcript_mismatch_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, crownApprovedTranscriptHash: T2 }), "crown_transcript_mismatch_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, requesterPopTranscriptHash: T2 }), "requester_pop_transcript_mismatch_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, presentedNonce: "nonce-B" }), "nonce_identity_substitution_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, nonceFreshAtCommit: false }), "expired_or_stale_nonce_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, nonceAlreadyConsumed: true }), "replayed_nonce_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, expiryAdmittedAtCommit: false }), "expired_challenge_at_commit_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, presentedRequesterEd25519: "attacker-ed25519" }), "ed25519_requester_substitution_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, presentedRequesterX25519: "attacker-x25519" }), "x25519_channel_key_substitution_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, requesterEd25519ProofOfPossession: false }), "missing_requester_ed25519_pop_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, proofOfPossessionBindsCompleteTranscript: false }), "pop_not_bound_to_both_requester_keys_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, presentedSessionId: "session-B" }), "session_id_substitution_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, serverPinned: false }), "untrusted_server_identity_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, currentRoleGeneration: "8", currentRoleRecordHash: H8 }), "revocation_before_session_commit_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, currentRoleRecordHash: H7_ALT }), "same_generation_different_role_hash_before_session_commit_must_fail");

for (const badGeneration of [7, "07", "+7", "7.0", "-1", "18446744073709551616", " 7", "7 "]) {
  assert(
    !bootstrapCommitAllowed({
      ...baseBootstrap,
      approvedRoleGeneration: badGeneration,
      currentRoleGeneration: badGeneration,
    }),
    `noncanonical_role_generation_must_fail:${String(badGeneration)}`,
  );
}
assert(isCanonicalUint64Decimal("0"), "uint64_zero_must_be_valid");
assert(isCanonicalUint64Decimal("18446744073709551615"), "uint64_max_must_be_valid");
assert(!isCanonicalUint64Decimal("18446744073709551616"), "uint64_overflow_must_fail");

const nearMaxAdvance = roleGenerationTransition("18446744073709551614", true);
assert(nearMaxAdvance.ok === true, "uint64_near_max_authority_change_must_succeed");
assert(nearMaxAdvance.generation === "18446744073709551615", "uint64_near_max_must_advance_to_max");
const maxReplay = roleGenerationTransition("18446744073709551615", false);
assert(maxReplay.ok === true && maxReplay.replay === true, "unchanged_max_generation_replay_must_be_stable");
assert(maxReplay.generation === "18446744073709551615", "max_replay_must_not_invent_successor");
const maxChange = roleGenerationTransition("18446744073709551615", true);
assert(maxChange.ok === false && maxChange.code === "ROLE_GENERATION_EXHAUSTED", "fresh_change_at_uint64_max_must_fail_closed");
assert(!Object.hasOwn(maxChange, "generation"), "exhausted_generation_must_not_wrap_or_emit_successor");

const stableSession = {
  sessionRoleGeneration: "7",
  sessionRoleRecordHash: H7,
  currentRoleGeneration: "7",
  currentRoleRecordHash: H7,
  currentRoleAuthorityExhausted: false,
};
assert(taskAdmissionCommitAllowed(stableSession), "stable_role_pair_task_admission_must_succeed");
assert(successorActivationCommitAllowed(stableSession), "stable_role_pair_successor_activation_must_succeed");
assert(!taskAdmissionCommitAllowed({ ...stableSession, currentRoleGeneration: "8", currentRoleRecordHash: H8 }), "revocation_after_session_before_task_effect_must_fail");
assert(!successorActivationCommitAllowed({ ...stableSession, currentRoleGeneration: "8", currentRoleRecordHash: H8 }), "revocation_racing_successor_activation_must_fail");
assert(!taskAdmissionCommitAllowed({ ...stableSession, currentRoleRecordHash: H7_ALT }), "same_generation_different_hash_task_effect_must_fail");
assert(!successorActivationCommitAllowed({ ...stableSession, currentRoleRecordHash: H7_ALT }), "same_generation_different_hash_successor_effect_must_fail");
assert(!taskAdmissionCommitAllowed({ ...stableSession, currentRoleGeneration: "9", currentRoleRecordHash: H9 }), "revoke_restore_aba_must_not_revive_old_task_authority");
assert(!successorActivationCommitAllowed({ ...stableSession, currentRoleGeneration: "9", currentRoleRecordHash: H9 }), "revoke_restore_aba_must_not_revive_old_rotation_authority");

const maxSession = {
  sessionRoleGeneration: "18446744073709551615",
  sessionRoleRecordHash: H9,
  currentRoleGeneration: "18446744073709551615",
  currentRoleRecordHash: H9,
  currentRoleAuthorityExhausted: true,
};
assert(!taskAdmissionCommitAllowed(maxSession), "role_generation_exhaustion_must_invalidate_task_authority");
assert(!successorActivationCommitAllowed(maxSession), "role_generation_exhaustion_must_invalidate_successor_authority");
assert(!bootstrapCommitAllowed({
  ...baseBootstrap,
  approvedRoleGeneration: "18446744073709551615",
  currentRoleGeneration: "18446744073709551615",
  approvedRoleRecordHash: H9,
  currentRoleRecordHash: H9,
  currentRoleAuthorityExhausted: true,
}), "role_generation_exhaustion_must_block_fresh_session_authority");

for (const badGeneration of [7, "07", "+7", "7.0", "-1", "18446744073709551616"]) {
  assert(!taskAdmissionCommitAllowed({
    ...stableSession,
    sessionRoleGeneration: badGeneration,
    currentRoleGeneration: badGeneration,
  }), `noncanonical_task_role_generation_must_fail:${String(badGeneration)}`);
  assert(!successorActivationCommitAllowed({
    ...stableSession,
    sessionRoleGeneration: badGeneration,
    currentRoleGeneration: badGeneration,
  }), `noncanonical_rotation_role_generation_must_fail:${String(badGeneration)}`);
}

for (const required of [
  "exact requester/session-adapter Ed25519 signing public key",
  "exact requester/session-adapter X25519 key-agreement public key",
  "same transcript containing both requester public keys",
  "generation and role-record hash as one authority pair",
  "durable session record must store that exact generation **and** role-record hash",
  "same generation with a different role-record hash",
  "revoke→restore ABA",
  "Unknown fields are rejected",
  "authenticated command/session activation remains disabled",
  "one exact canonical transcript generation",
  "utf8_json_array_v1",
  "issued-at and expiry elements use canonical UTC RFC3339 seconds",
  "digest supplied independently of the field vector is not authority",
  "Changing any one authority-bearing transcript field",
  "Atomic nonce consumption and session creation",
  "FRESH(nonce, transcript_sha256) → COMMITTED",
  "There is no authoritative `CONSUMED_WITHOUT_SESSION` state",
  "byte/identity-equivalent retry returns the already committed generation-0 session",
  "crash after the atomic commit but before the response escapes",
  "server/broker signature must verify over the exact canonical bootstrap transcript bytes",
  "Crown approval signature must verify over those same canonical transcript bytes",
  "nonce identity must match the approved transcript",
  "ROLE_GENERATION_EXHAUSTED",
  "no wrap to `0`",
  "Sovereign-ratified epoch/namespace migration",
]) assert(doc.includes(required), `doc_missing_required_binding:${required}`);

for (const forbidden of [
  /-----BEGIN (?:OPENSSH |EC |RSA )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{12,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /Bearer\s+[A-Za-z0-9._~+\/-]{12,}/i,
]) {
  assert(!forbidden.test(doc), "secret_like_material_detected_in_doc");
  assert(!forbidden.test(fixtureText), "secret_like_material_detected_in_fixture");
}

console.log("VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_PROOF_GREEN");
console.log("closed_machine_schema=true");
console.log("requester_ed25519_binding=true");
console.log("requester_x25519_binding=true");
console.log("requester_pop_covers_complete_dual_key_transcript=true");
console.log("role_generation_wire_identity=canonical_unsigned_decimal_uint64_string");
console.log("bootstrap_authenticated_transcript_commit_binding=true");
console.log("canonical_bootstrap_transcript_encoding=utf8_json_array_v1");
console.log("canonical_bootstrap_transcript_field_hash_binding=true");
console.log("canonical_bootstrap_transcript_field_mutation_matrix=13");
console.log("bootstrap_server_and_crown_signatures_same_transcript=true");
console.log("bootstrap_nonce_expiry_replay_commit_boundary=true");
console.log("bootstrap_nonce_session_atomic_commit=true");
console.log("bootstrap_two_contender_single_fresh_authority=true");
console.log("bootstrap_exact_retry_same_session_receipt=true");
console.log("bootstrap_conflicting_nonce_reuse_rejected=true");
console.log("bootstrap_precommit_crash_recoverable=true");
console.log("bootstrap_postcommit_response_loss_idempotent=true");
console.log("bootstrap_consumed_without_session_state=false");
console.log("role_generation_exhaustion_fail_closed=true");
console.log("focused_workflow_committed_range_self_enforced=true");
console.log("role_authority_generation_and_record_hash_atomicity=true");
console.log("task_effect_boundary_role_pair_checked=true");
console.log("successor_effect_boundary_role_pair_checked=true");
console.log("revoke_restore_aba_rejected=true");
console.log("runtime_activation=false");
