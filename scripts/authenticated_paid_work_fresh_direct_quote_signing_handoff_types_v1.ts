import type {
  AuthenticatedPaidWorkDirectQuoteActivationAuthenticationInputV1,
  AuthenticatedPaidWorkDirectQuoteActivationAuthenticationPacketV1,
  DirectProviderAuthenticationBodyV1,
  DirectProviderAuthenticationEnvelopeV1,
  DirectProviderKeyBindingDraftV1,
  DirectProviderKeyBindingV1,
  DirectRequesterAuthenticationBodyV1,
  DirectRequesterAuthenticationEnvelopeV1,
  DirectRequesterKeyBindingDraftV1,
  DirectRequesterKeyBindingV1,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";
import {
  DIRECT_AUTHENTICATION_CANONICALIZATION,
  DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
  DIRECT_PROVIDER_SIGNATURE_DOMAIN,
  DIRECT_REQUESTER_SIGNATURE_DOMAIN,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";

export const FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_INPUT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_V1" as const;
export const FRESH_DIRECT_QUOTE_PROVIDER_HANDOFF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_PROVIDER_SIGNING_HANDOFF_V1" as const;
export const FRESH_DIRECT_QUOTE_REQUESTER_HANDOFF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_REQUESTER_SIGNING_HANDOFF_V1" as const;
export const FRESH_DIRECT_QUOTE_FINAL_HANDOFF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_FINAL_V1" as const;
export const FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_V1" as const;

export const PROVIDER_HANDOFF_ID_PREFIX = "voidafdqph1_" as const;
export const REQUESTER_HANDOFF_ID_PREFIX = "voidafdqrh1_" as const;
export const FINAL_HANDOFF_ID_PREFIX = "voidafdqfh1_" as const;
export const FRESH_DIRECT_QUOTE_MAX_JSON_BYTES = 32 * 1024 * 1024;

export type FreshDirectQuoteSignerRoleV1 = "provider" | "requester";

export interface FreshDirectQuoteAuthenticationPlanV1 {
  authentication_nonce: string;
  created_at_utc: string;
  expires_at_utc: string;
}

export interface AuthenticatedPaidWorkFreshDirectQuoteSigningHandoffInputV1 {
  marker: typeof FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_INPUT_MARKER;
  version: 1;
  prepared_input: unknown;
  provider_key_binding_draft: DirectProviderKeyBindingDraftV1;
  requester_key_binding_draft: DirectRequesterKeyBindingDraftV1;
  provider_authentication_plan: FreshDirectQuoteAuthenticationPlanV1;
  requester_authentication_plan: FreshDirectQuoteAuthenticationPlanV1;
  controls: {
    prepare_only: true;
    external_signing_required: true;
    private_key_access_forbidden: true;
    provider_signature_before_requester_required: true;
    canonical_signature_bytes_required: true;
    atomic_persistence_after_authentication_required: true;
    separate_payment_execution_authorization_required: true;
    separate_work_execution_authorization_required: true;
  };
}

export interface FreshDirectQuoteExternalSignatureV1 {
  marker: typeof FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER;
  version: 1;
  signer_role: FreshDirectQuoteSignerRoleV1;
  key_id: string;
  signing_bytes_sha256: string;
  signature_base64: string;
}

export interface FreshDirectQuoteSigningRequestV1 {
  signature_scheme: typeof DIRECT_AUTHENTICATION_SIGNATURE_SCHEME;
  signature_domain:
    | typeof DIRECT_PROVIDER_SIGNATURE_DOMAIN
    | typeof DIRECT_REQUESTER_SIGNATURE_DOMAIN;
  canonicalization: typeof DIRECT_AUTHENTICATION_CANONICALIZATION;
  key_id: string;
  signing_bytes_base64: string;
  signing_bytes_sha256: string;
  signing_bytes_length: number;
}

export interface FreshDirectQuoteSourceV1 {
  prepared_packet_id: string;
  prepared_packet_fingerprint_sha256: string;
  work_order_id: string;
  quote_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  requester_agent_id: string;
  provider_id: string;
}

export interface FreshDirectQuoteNoAuthorityV1 {
  quote_acceptance: false;
  acceptance_persistence: false;
  payment_authorization: false;
  payment_execution: false;
  work_execution_authorization: false;
  work_dispatch: false;
  wallet_access: false;
  production_signing: false;
  transaction_construction: false;
  transaction_broadcast: false;
  payment_receipt_creation: false;
  work_credit_write: false;
  void_settlement: false;
  http_submission: false;
  runtime_mutation: false;
  service_restart: false;
  deployment: false;
  money_movement: false;
}

export interface AuthenticatedPaidWorkFreshDirectQuoteProviderSigningHandoffV1 {
  marker: typeof FRESH_DIRECT_QUOTE_PROVIDER_HANDOFF_MARKER;
  version: 1;
  status: "provider_signature_required";
  source: FreshDirectQuoteSourceV1;
  provider_key_binding: DirectProviderKeyBindingV1;
  requester_key_binding: DirectRequesterKeyBindingV1;
  provider_authentication_body: DirectProviderAuthenticationBodyV1;
  provider_signing_request: FreshDirectQuoteSigningRequestV1;
  requester_authentication_plan: FreshDirectQuoteAuthenticationPlanV1;
  controls: {
    private_key_access_forbidden: true;
    signature_must_be_produced_externally: true;
    requester_signature_blocked_until_provider_signature_verified: true;
    quote_acceptance: false;
    payment_authorization: false;
    payment_execution: false;
    work_dispatch: false;
    work_credit_write: false;
    wallet_access: false;
    money_movement: false;
  };
  handoff_id: string;
}

export type FreshDirectQuoteProviderHandoffWithoutIdV1 = Omit<
  AuthenticatedPaidWorkFreshDirectQuoteProviderSigningHandoffV1,
  "handoff_id"
>;

export interface AuthenticatedPaidWorkFreshDirectQuoteRequesterSigningHandoffV1 {
  marker: typeof FRESH_DIRECT_QUOTE_REQUESTER_HANDOFF_MARKER;
  version: 1;
  status: "requester_signature_required";
  provider_handoff_id: string;
  source: FreshDirectQuoteSourceV1;
  provider_authentication_envelope: DirectProviderAuthenticationEnvelopeV1;
  requester_authentication_body: DirectRequesterAuthenticationBodyV1;
  requester_signing_request: FreshDirectQuoteSigningRequestV1;
  controls: {
    provider_signature_verified: true;
    private_key_access_forbidden: true;
    signature_must_be_produced_externally: true;
    quote_acceptance: false;
    payment_authorization: false;
    payment_execution: false;
    work_dispatch: false;
    work_credit_write: false;
    wallet_access: false;
    money_movement: false;
  };
  handoff_id: string;
}

export type FreshDirectQuoteRequesterHandoffWithoutIdV1 = Omit<
  AuthenticatedPaidWorkFreshDirectQuoteRequesterSigningHandoffV1,
  "handoff_id"
>;

export interface AuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1 {
  marker: typeof FRESH_DIRECT_QUOTE_FINAL_HANDOFF_MARKER;
  version: 1;
  status: "direct_quote_authenticated_for_atomic_persistence";
  provider_handoff_id: string;
  requester_handoff_id: string;
  source: FreshDirectQuoteSourceV1;
  direct_authentication_input: AuthenticatedPaidWorkDirectQuoteActivationAuthenticationInputV1;
  direct_authentication_packet: AuthenticatedPaidWorkDirectQuoteActivationAuthenticationPacketV1;
  next_gate: {
    persistence_adapter_mode: "direct_authentication_packet";
    action: "atomically_persist_quote_acceptance_and_payment_authority";
    fresh_replay_snapshots_required: true;
    fresh_operation_bound_confirmation_required: true;
    separate_payment_execution_authorization_required: true;
    separate_work_execution_authorization_required: true;
  };
  authority: FreshDirectQuoteNoAuthorityV1;
  handoff_id: string;
}

export type FreshDirectQuoteFinalHandoffWithoutIdV1 = Omit<
  AuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1,
  "handoff_id"
>;
