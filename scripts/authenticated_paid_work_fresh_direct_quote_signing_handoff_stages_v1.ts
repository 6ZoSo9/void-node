import crypto from "node:crypto";

import {
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_v1.js";
import {
  DIRECT_AUTHENTICATION_CANONICALIZATION,
  DIRECT_AUTHENTICATION_INPUT_MARKER,
  DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
  DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER,
  DIRECT_PROVIDER_SIGNATURE_DOMAIN,
  DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_MARKER,
  DIRECT_REQUESTER_SIGNATURE_DOMAIN,
  directProviderAuthenticationIdV1,
  directProviderAuthenticationSigningBytesV1,
  directRequesterAuthenticationIdV1,
  directRequesterAuthenticationSigningBytesV1,
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1,
  type AuthenticatedPaidWorkDirectQuoteActivationAuthenticationInputV1,
  type DirectProviderAuthenticationBodyV1,
  type DirectProviderAuthenticationEnvelopeV1,
  type DirectRequesterAuthenticationBodyV1,
  type DirectRequesterAuthenticationEnvelopeV1,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";
import {
  compareFreshDirectQuoteCanonicalV1,
  freshDirectQuoteAssertV1,
  freshDirectQuotePublicKeyFromPemV1,
  requireFreshDirectQuoteRecordV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_base_v1.js";
import {
  validateFreshDirectQuoteInputV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_validation_v1.js";
import {
  freshDirectQuoteFinalHandoffIdV1,
  freshDirectQuoteProviderHandoffIdV1,
  freshDirectQuoteRequesterHandoffIdV1,
  freshDirectQuoteSigningRequestV1,
  freshDirectQuoteSourceFromPreparedV1,
  noFreshDirectQuoteAuthorityV1,
  validateFreshDirectQuoteExternalSignatureV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_shared_v1.js";
import {
  FRESH_DIRECT_QUOTE_FINAL_HANDOFF_MARKER,
  FRESH_DIRECT_QUOTE_PROVIDER_HANDOFF_MARKER,
  FRESH_DIRECT_QUOTE_REQUESTER_HANDOFF_MARKER,
  type AuthenticatedPaidWorkFreshDirectQuoteProviderSigningHandoffV1,
  type AuthenticatedPaidWorkFreshDirectQuoteRequesterSigningHandoffV1,
  type AuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1,
  type FreshDirectQuoteFinalHandoffWithoutIdV1,
  type FreshDirectQuoteProviderHandoffWithoutIdV1,
  type FreshDirectQuoteRequesterHandoffWithoutIdV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_types_v1.js";

export function prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
  inputValue: unknown,
): AuthenticatedPaidWorkFreshDirectQuoteProviderSigningHandoffV1 {
  const validated = validateFreshDirectQuoteInputV1(inputValue);
  const source = freshDirectQuoteSourceFromPreparedV1(
    validated.preparedPacket,
  );
  const providerBody: DirectProviderAuthenticationBodyV1 = {
    marker: DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER,
    version: 1,
    signature_scheme: DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
    signature_domain: DIRECT_PROVIDER_SIGNATURE_DOMAIN,
    canonicalization: DIRECT_AUTHENTICATION_CANONICALIZATION,
    prepared_packet_id: source.prepared_packet_id,
    prepared_packet_fingerprint_sha256:
      source.prepared_packet_fingerprint_sha256,
    quote_id: source.quote_id,
    work_order_id: source.work_order_id,
    acceptance_id: source.acceptance_id,
    payment_intent_id: source.payment_intent_id,
    provider_id: source.provider_id,
    provider_key_binding_id: validated.providerBinding.binding_id,
    authentication_nonce: validated.providerPlan.authentication_nonce,
    created_at_utc: validated.providerPlan.created_at_utc,
    expires_at_utc: validated.providerPlan.expires_at_utc,
  };
  const providerBytes =
    directProviderAuthenticationSigningBytesV1(providerBody);
  const withoutId: FreshDirectQuoteProviderHandoffWithoutIdV1 = {
    marker: FRESH_DIRECT_QUOTE_PROVIDER_HANDOFF_MARKER,
    version: 1,
    status: "provider_signature_required",
    source,
    provider_key_binding: validated.providerBinding,
    requester_key_binding: validated.requesterBinding,
    provider_authentication_body: providerBody,
    provider_signing_request: freshDirectQuoteSigningRequestV1(
      "provider",
      validated.providerBinding.key_id,
      providerBytes,
    ),
    requester_authentication_plan: validated.requesterPlan,
    controls: {
      private_key_access_forbidden: true,
      signature_must_be_produced_externally: true,
      requester_signature_blocked_until_provider_signature_verified: true,
      quote_acceptance: false,
      payment_authorization: false,
      payment_execution: false,
      work_dispatch: false,
      work_credit_write: false,
      wallet_access: false,
      money_movement: false,
    },
  };
  return {
    ...withoutId,
    handoff_id: freshDirectQuoteProviderHandoffIdV1(withoutId),
  };
}

function validateProviderHandoff(
  inputValue: unknown,
  packetValue: unknown,
): AuthenticatedPaidWorkFreshDirectQuoteProviderSigningHandoffV1 {
  const expected =
    prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(inputValue);
  compareFreshDirectQuoteCanonicalV1(
    packetValue,
    expected,
    "provider handoff",
  );
  return expected;
}

export function advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
  inputValue: unknown,
  providerHandoffValue: unknown,
  providerSignatureValue: unknown,
): AuthenticatedPaidWorkFreshDirectQuoteRequesterSigningHandoffV1 {
  const providerHandoff = validateProviderHandoff(
    inputValue,
    providerHandoffValue,
  );
  const signature = validateFreshDirectQuoteExternalSignatureV1(
    providerSignatureValue,
    "provider",
    providerHandoff.provider_signing_request,
  );
  const providerBytes = Buffer.from(
    providerHandoff.provider_signing_request.signing_bytes_base64,
    "base64",
  );
  freshDirectQuoteAssertV1(
    crypto.verify(
      null,
      providerBytes,
      freshDirectQuotePublicKeyFromPemV1(
        providerHandoff.provider_key_binding.public_key_pem,
      ),
      Buffer.from(signature.signature_base64, "base64"),
    ),
    "provider signature verification failed",
  );
  const providerEnvelope: DirectProviderAuthenticationEnvelopeV1 = {
    ...providerHandoff.provider_authentication_body,
    signature_base64: signature.signature_base64,
    authentication_id: directProviderAuthenticationIdV1({
      ...providerHandoff.provider_authentication_body,
      signature_base64: signature.signature_base64,
    }),
  };
  const inputRoot = requireFreshDirectQuoteRecordV1(inputValue, "input");
  const prepared =
    materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
      inputRoot.prepared_input,
    );
  const requesterBody: DirectRequesterAuthenticationBodyV1 = {
    marker: DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_MARKER,
    version: 1,
    signature_scheme: DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
    signature_domain: DIRECT_REQUESTER_SIGNATURE_DOMAIN,
    canonicalization: DIRECT_AUTHENTICATION_CANONICALIZATION,
    prepared_packet_id: providerHandoff.source.prepared_packet_id,
    prepared_packet_fingerprint_sha256:
      providerHandoff.source.prepared_packet_fingerprint_sha256,
    quote_id: providerHandoff.source.quote_id,
    work_order_id: providerHandoff.source.work_order_id,
    acceptance_id: providerHandoff.source.acceptance_id,
    payment_intent_id: providerHandoff.source.payment_intent_id,
    requester_agent_id: providerHandoff.source.requester_agent_id,
    requester_key_binding_id:
      providerHandoff.requester_key_binding.binding_id,
    provider_authentication_id: providerEnvelope.authentication_id,
    acceptance_nonce:
      prepared.prepared_artifacts.acceptance_envelope.nonce,
    authentication_nonce:
      providerHandoff.requester_authentication_plan.authentication_nonce,
    created_at_utc:
      providerHandoff.requester_authentication_plan.created_at_utc,
    expires_at_utc:
      providerHandoff.requester_authentication_plan.expires_at_utc,
  };
  const requesterBytes =
    directRequesterAuthenticationSigningBytesV1(requesterBody);
  const withoutId: FreshDirectQuoteRequesterHandoffWithoutIdV1 = {
    marker: FRESH_DIRECT_QUOTE_REQUESTER_HANDOFF_MARKER,
    version: 1,
    status: "requester_signature_required",
    provider_handoff_id: providerHandoff.handoff_id,
    source: providerHandoff.source,
    provider_authentication_envelope: providerEnvelope,
    requester_authentication_body: requesterBody,
    requester_signing_request: freshDirectQuoteSigningRequestV1(
      "requester",
      providerHandoff.requester_key_binding.key_id,
      requesterBytes,
    ),
    controls: {
      provider_signature_verified: true,
      private_key_access_forbidden: true,
      signature_must_be_produced_externally: true,
      quote_acceptance: false,
      payment_authorization: false,
      payment_execution: false,
      work_dispatch: false,
      work_credit_write: false,
      wallet_access: false,
      money_movement: false,
    },
  };
  return {
    ...withoutId,
    handoff_id: freshDirectQuoteRequesterHandoffIdV1(withoutId),
  };
}

function validateRequesterHandoff(
  inputValue: unknown,
  providerHandoffValue: unknown,
  providerSignatureValue: unknown,
  requesterHandoffValue: unknown,
): AuthenticatedPaidWorkFreshDirectQuoteRequesterSigningHandoffV1 {
  const expected =
    advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
      inputValue,
      providerHandoffValue,
      providerSignatureValue,
    );
  compareFreshDirectQuoteCanonicalV1(
    requesterHandoffValue,
    expected,
    "requester handoff",
  );
  return expected;
}

export function finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
  inputValue: unknown,
  providerHandoffValue: unknown,
  providerSignatureValue: unknown,
  requesterHandoffValue: unknown,
  requesterSignatureValue: unknown,
): AuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1 {
  const providerHandoff = validateProviderHandoff(
    inputValue,
    providerHandoffValue,
  );
  const requesterHandoff = validateRequesterHandoff(
    inputValue,
    providerHandoffValue,
    providerSignatureValue,
    requesterHandoffValue,
  );
  const signature = validateFreshDirectQuoteExternalSignatureV1(
    requesterSignatureValue,
    "requester",
    requesterHandoff.requester_signing_request,
  );
  const requesterBytes = Buffer.from(
    requesterHandoff.requester_signing_request.signing_bytes_base64,
    "base64",
  );
  freshDirectQuoteAssertV1(
    crypto.verify(
      null,
      requesterBytes,
      freshDirectQuotePublicKeyFromPemV1(
        providerHandoff.requester_key_binding.public_key_pem,
      ),
      Buffer.from(signature.signature_base64, "base64"),
    ),
    "requester signature verification failed",
  );
  const requesterEnvelope: DirectRequesterAuthenticationEnvelopeV1 = {
    ...requesterHandoff.requester_authentication_body,
    signature_base64: signature.signature_base64,
    authentication_id: directRequesterAuthenticationIdV1({
      ...requesterHandoff.requester_authentication_body,
      signature_base64: signature.signature_base64,
    }),
  };
  const inputRoot = requireFreshDirectQuoteRecordV1(inputValue, "input");
  const preparedPacket =
    materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
      inputRoot.prepared_input,
    );
  const directInput: AuthenticatedPaidWorkDirectQuoteActivationAuthenticationInputV1 = {
    marker: DIRECT_AUTHENTICATION_INPUT_MARKER,
    version: 1,
    evidence_mode: "operator_signed_direct_lineage",
    prepared_packet: preparedPacket,
    provider_key_binding: providerHandoff.provider_key_binding,
    provider_authentication_envelope:
      requesterHandoff.provider_authentication_envelope,
    requester_key_binding: providerHandoff.requester_key_binding,
    requester_authentication_envelope: requesterEnvelope,
  };
  const directPacket =
    materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
      directInput,
    );
  freshDirectQuoteAssertV1(
    directPacket.status ===
      "direct_lineage_authenticated_for_atomic_activation",
    "direct packet did not reach authenticated status",
  );
  freshDirectQuoteAssertV1(
    directPacket.activation_gate.eligible_for_atomic_activation_persistence ===
      true,
    "direct packet is not eligible for atomic persistence",
  );
  const withoutId: FreshDirectQuoteFinalHandoffWithoutIdV1 = {
    marker: FRESH_DIRECT_QUOTE_FINAL_HANDOFF_MARKER,
    version: 1,
    status: "direct_quote_authenticated_for_atomic_persistence",
    provider_handoff_id: providerHandoff.handoff_id,
    requester_handoff_id: requesterHandoff.handoff_id,
    source: providerHandoff.source,
    direct_authentication_input: directInput,
    direct_authentication_packet: directPacket,
    next_gate: {
      persistence_adapter_mode: "direct_authentication_packet",
      action: "atomically_persist_quote_acceptance_and_payment_authority",
      fresh_replay_snapshots_required: true,
      fresh_operation_bound_confirmation_required: true,
      separate_payment_execution_authorization_required: true,
      separate_work_execution_authorization_required: true,
    },
    authority: noFreshDirectQuoteAuthorityV1(),
  };
  return {
    ...withoutId,
    handoff_id: freshDirectQuoteFinalHandoffIdV1(withoutId),
  };
}

export function verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1(
  inputValue: unknown,
  providerHandoffValue: unknown,
  providerSignatureValue: unknown,
  requesterHandoffValue: unknown,
  requesterSignatureValue: unknown,
  finalHandoffValue: unknown,
): AuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1 {
  const expected =
    finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
      inputValue,
      providerHandoffValue,
      providerSignatureValue,
      requesterHandoffValue,
      requesterSignatureValue,
    );
  compareFreshDirectQuoteCanonicalV1(
    finalHandoffValue,
    expected,
    "final handoff",
  );
  return expected;
}
