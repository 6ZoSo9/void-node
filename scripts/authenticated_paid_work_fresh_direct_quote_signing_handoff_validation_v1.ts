import {
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  type AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_v1.js";
import {
  DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
  DIRECT_PROVIDER_KEY_BINDING_MARKER,
  DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
  DIRECT_REQUESTER_KEY_BINDING_MARKER,
  directAuthenticationKeyIdV1,
  directProviderKeyBindingIdV1,
  directRequesterKeyBindingIdV1,
  type DirectProviderKeyBindingDraftV1,
  type DirectProviderKeyBindingV1,
  type DirectRequesterKeyBindingDraftV1,
  type DirectRequesterKeyBindingV1,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";
import {
  FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_INPUT_MARKER,
  type FreshDirectQuoteAuthenticationPlanV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_types_v1.js";
import {
  freshDirectQuoteAssertV1,
  parseFreshDirectQuoteUtcV1,
  rejectFreshDirectQuoteSecretMaterialV1,
  requireFreshDirectQuoteExactKeysV1,
  requireFreshDirectQuotePublicKeyPemV1,
  requireFreshDirectQuoteRecordV1,
  requireFreshDirectQuoteStringV1,
  requireFreshDirectQuoteUtcV1,
  validateFreshDirectQuoteControlsV1,
  validateFreshDirectQuotePlanV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_base_v1.js";

const NONCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
const KEY_ID = /^ed25519:[0-9a-f]{64}$/;

export interface ValidatedFreshDirectQuoteInputV1 {
  preparedPacket: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1;
  providerBinding: DirectProviderKeyBindingV1;
  requesterBinding: DirectRequesterKeyBindingV1;
  providerPlan: FreshDirectQuoteAuthenticationPlanV1;
  requesterPlan: FreshDirectQuoteAuthenticationPlanV1;
}

function validateProviderBindingDraft(
  value: unknown,
  packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
): DirectProviderKeyBindingDraftV1 {
  const root = requireFreshDirectQuoteRecordV1(
    value,
    "provider_key_binding_draft",
  );
  requireFreshDirectQuoteExactKeysV1(root, "provider_key_binding_draft", [
    "marker",
    "version",
    "binding_status",
    "provider_id",
    "authority_scope",
    "key_id",
    "public_key_pem",
    "valid_from_utc",
    "expires_at_utc",
    "revoked_at_utc",
    "binding_nonce",
  ]);
  freshDirectQuoteAssertV1(
    root.marker === DIRECT_PROVIDER_KEY_BINDING_MARKER,
    "provider binding marker mismatch",
  );
  freshDirectQuoteAssertV1(
    root.version === 1,
    "provider binding version mismatch",
  );
  freshDirectQuoteAssertV1(
    root.binding_status === "operator_approved_snapshot",
    "provider binding must be operator-approved",
  );
  freshDirectQuoteAssertV1(
    root.provider_id === packet.source.provider_id,
    "provider identity mismatch",
  );
  freshDirectQuoteAssertV1(
    root.authority_scope === DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
    "provider scope mismatch",
  );
  const publicKeyPem = requireFreshDirectQuotePublicKeyPemV1(
    root.public_key_pem,
    "provider public_key_pem",
  );
  const keyId = requireFreshDirectQuoteStringV1(
    root.key_id,
    "provider key_id",
    KEY_ID,
    72,
    72,
  );
  freshDirectQuoteAssertV1(
    keyId === directAuthenticationKeyIdV1(publicKeyPem),
    "provider key_id mismatch",
  );
  const validFromUtc = requireFreshDirectQuoteUtcV1(
    root.valid_from_utc,
    "provider valid_from_utc",
  );
  const expiresAtUtc = requireFreshDirectQuoteUtcV1(
    root.expires_at_utc,
    "provider expires_at_utc",
  );
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(expiresAtUtc) > parseFreshDirectQuoteUtcV1(validFromUtc),
    "provider binding window invalid",
  );
  const revokedAtUtc =
    root.revoked_at_utc === null
      ? null
      : requireFreshDirectQuoteUtcV1(root.revoked_at_utc, "provider revoked_at_utc");
  const bindingNonce = requireFreshDirectQuoteStringV1(
    root.binding_nonce,
    "provider binding_nonce",
    NONCE,
    16,
    128,
  );
  return {
    marker: DIRECT_PROVIDER_KEY_BINDING_MARKER,
    version: 1,
    binding_status: "operator_approved_snapshot",
    provider_id: packet.source.provider_id,
    authority_scope: DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
    key_id: keyId,
    public_key_pem: publicKeyPem,
    valid_from_utc: validFromUtc,
    expires_at_utc: expiresAtUtc,
    revoked_at_utc: revokedAtUtc,
    binding_nonce: bindingNonce,
  };
}

function validateRequesterBindingDraft(
  value: unknown,
  packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
): DirectRequesterKeyBindingDraftV1 {
  const root = requireFreshDirectQuoteRecordV1(
    value,
    "requester_key_binding_draft",
  );
  requireFreshDirectQuoteExactKeysV1(root, "requester_key_binding_draft", [
    "marker",
    "version",
    "binding_status",
    "requester_agent_id",
    "authority_scope",
    "key_id",
    "public_key_pem",
    "valid_from_utc",
    "expires_at_utc",
    "revoked_at_utc",
    "binding_nonce",
  ]);
  freshDirectQuoteAssertV1(
    root.marker === DIRECT_REQUESTER_KEY_BINDING_MARKER,
    "requester binding marker mismatch",
  );
  freshDirectQuoteAssertV1(
    root.version === 1,
    "requester binding version mismatch",
  );
  freshDirectQuoteAssertV1(
    root.binding_status === "operator_approved_snapshot",
    "requester binding must be operator-approved",
  );
  freshDirectQuoteAssertV1(
    root.requester_agent_id === packet.source.requester_agent_id,
    "requester identity mismatch",
  );
  freshDirectQuoteAssertV1(
    root.authority_scope === DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
    "requester scope mismatch",
  );
  const publicKeyPem = requireFreshDirectQuotePublicKeyPemV1(
    root.public_key_pem,
    "requester public_key_pem",
  );
  const keyId = requireFreshDirectQuoteStringV1(
    root.key_id,
    "requester key_id",
    KEY_ID,
    72,
    72,
  );
  freshDirectQuoteAssertV1(
    keyId === directAuthenticationKeyIdV1(publicKeyPem),
    "requester key_id mismatch",
  );
  const validFromUtc = requireFreshDirectQuoteUtcV1(
    root.valid_from_utc,
    "requester valid_from_utc",
  );
  const expiresAtUtc = requireFreshDirectQuoteUtcV1(
    root.expires_at_utc,
    "requester expires_at_utc",
  );
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(expiresAtUtc) > parseFreshDirectQuoteUtcV1(validFromUtc),
    "requester binding window invalid",
  );
  const revokedAtUtc =
    root.revoked_at_utc === null
      ? null
      : requireFreshDirectQuoteUtcV1(root.revoked_at_utc, "requester revoked_at_utc");
  const bindingNonce = requireFreshDirectQuoteStringV1(
    root.binding_nonce,
    "requester binding_nonce",
    NONCE,
    16,
    128,
  );
  return {
    marker: DIRECT_REQUESTER_KEY_BINDING_MARKER,
    version: 1,
    binding_status: "operator_approved_snapshot",
    requester_agent_id: packet.source.requester_agent_id,
    authority_scope: DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
    key_id: keyId,
    public_key_pem: publicKeyPem,
    valid_from_utc: validFromUtc,
    expires_at_utc: expiresAtUtc,
    revoked_at_utc: revokedAtUtc,
    binding_nonce: bindingNonce,
  };
}

export function validateFreshDirectQuoteInputV1(
  value: unknown,
): ValidatedFreshDirectQuoteInputV1 {
  rejectFreshDirectQuoteSecretMaterialV1(value);
  const root = requireFreshDirectQuoteRecordV1(value, "input");
  requireFreshDirectQuoteExactKeysV1(root, "input", [
    "marker",
    "version",
    "prepared_input",
    "provider_key_binding_draft",
    "requester_key_binding_draft",
    "provider_authentication_plan",
    "requester_authentication_plan",
    "controls",
  ]);
  freshDirectQuoteAssertV1(
    root.marker === FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_INPUT_MARKER,
    "input marker mismatch",
  );
  freshDirectQuoteAssertV1(root.version === 1, "input version mismatch");
  validateFreshDirectQuoteControlsV1(root.controls);
  const preparedPacket =
    materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
      root.prepared_input,
    );
  const providerDraft = validateProviderBindingDraft(
    root.provider_key_binding_draft,
    preparedPacket,
  );
  const requesterDraft = validateRequesterBindingDraft(
    root.requester_key_binding_draft,
    preparedPacket,
  );
  const providerBinding: DirectProviderKeyBindingV1 = {
    ...providerDraft,
    binding_id: directProviderKeyBindingIdV1(providerDraft),
  };
  const requesterBinding: DirectRequesterKeyBindingV1 = {
    ...requesterDraft,
    binding_id: directRequesterKeyBindingIdV1(requesterDraft),
  };
  const providerPlan = validateFreshDirectQuotePlanV1(
    root.provider_authentication_plan,
    "provider_authentication_plan",
  );
  const requesterPlan = validateFreshDirectQuotePlanV1(
    root.requester_authentication_plan,
    "requester_authentication_plan",
  );
  const acceptance = preparedPacket.prepared_artifacts.acceptance_envelope;
  const paymentIntent =
    preparedPacket.prepared_artifacts.payment_intent_envelope;
  const preparedExpiry = Math.min(
    parseFreshDirectQuoteUtcV1(acceptance.expires_at_utc),
    parseFreshDirectQuoteUtcV1(paymentIntent.expires_at_utc),
  );
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(providerPlan.created_at_utc) >=
      parseFreshDirectQuoteUtcV1(providerBinding.valid_from_utc),
    "provider authentication predates binding",
  );
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(providerPlan.expires_at_utc) <=
      parseFreshDirectQuoteUtcV1(providerBinding.expires_at_utc),
    "provider authentication outlives binding",
  );
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(providerPlan.expires_at_utc) <= preparedExpiry,
    "provider authentication outlives prepared quote",
  );
  if (providerBinding.revoked_at_utc !== null) {
    freshDirectQuoteAssertV1(
      parseFreshDirectQuoteUtcV1(providerPlan.created_at_utc) <
        parseFreshDirectQuoteUtcV1(providerBinding.revoked_at_utc),
      "provider binding is revoked",
    );
  }
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(requesterPlan.created_at_utc) >=
      parseFreshDirectQuoteUtcV1(providerPlan.created_at_utc),
    "requester authentication predates provider authentication",
  );
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(requesterPlan.created_at_utc) >=
      parseFreshDirectQuoteUtcV1(requesterBinding.valid_from_utc),
    "requester authentication predates binding",
  );
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(requesterPlan.expires_at_utc) <=
      parseFreshDirectQuoteUtcV1(requesterBinding.expires_at_utc),
    "requester authentication outlives binding",
  );
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(requesterPlan.expires_at_utc) <=
      parseFreshDirectQuoteUtcV1(providerPlan.expires_at_utc),
    "requester authentication outlives provider authentication",
  );
  freshDirectQuoteAssertV1(
    parseFreshDirectQuoteUtcV1(requesterPlan.expires_at_utc) <= preparedExpiry,
    "requester authentication outlives prepared quote",
  );
  if (requesterBinding.revoked_at_utc !== null) {
    freshDirectQuoteAssertV1(
      parseFreshDirectQuoteUtcV1(requesterPlan.created_at_utc) <
        parseFreshDirectQuoteUtcV1(requesterBinding.revoked_at_utc),
      "requester binding is revoked",
    );
  }
  return {
    preparedPacket,
    providerBinding,
    requesterBinding,
    providerPlan,
    requesterPlan,
  };
}
