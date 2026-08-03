import {
  canonicalJson,
  sha256Hex,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";
import {
  FINAL_HANDOFF_ID_PREFIX,
  FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
  PROVIDER_HANDOFF_ID_PREFIX,
  REQUESTER_HANDOFF_ID_PREFIX,
  type FreshDirectQuoteExternalSignatureV1,
  type FreshDirectQuoteFinalHandoffWithoutIdV1,
  type FreshDirectQuoteNoAuthorityV1,
  type FreshDirectQuoteProviderHandoffWithoutIdV1,
  type FreshDirectQuoteRequesterHandoffWithoutIdV1,
  type FreshDirectQuoteSignerRoleV1,
  type FreshDirectQuoteSigningRequestV1,
  type FreshDirectQuoteSourceV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_types_v1.js";
import {
  freshDirectQuoteAssertV1,
  rejectFreshDirectQuoteSecretMaterialV1,
  requireFreshDirectQuoteExactKeysV1,
  requireFreshDirectQuoteRecordV1,
  requireFreshDirectQuoteStringV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_base_v1.js";
import type { AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1 } from "./authenticated_paid_work_quote_acceptance_payment_authority_v1.js";

const KEY_ID = /^ed25519:[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SIGNATURE = /^(?:[A-Za-z0-9+/]{4}){21}[A-Za-z0-9+/]{2}==$/;

export function freshDirectQuoteSourceFromPreparedV1(
  packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
): FreshDirectQuoteSourceV1 {
  return {
    prepared_packet_id: packet.packet_id,
    prepared_packet_fingerprint_sha256: sha256Hex(canonicalJson(packet)),
    work_order_id: packet.source.work_order_id,
    quote_id: packet.source.quote_id,
    acceptance_id:
      packet.prepared_artifacts.acceptance_envelope.acceptance_id,
    payment_intent_id:
      packet.prepared_artifacts.payment_intent_envelope.payment_intent_id,
    requester_agent_id: packet.source.requester_agent_id,
    provider_id: packet.source.provider_id,
  };
}

export function freshDirectQuoteSigningRequestV1(
  role: FreshDirectQuoteSignerRoleV1,
  keyId: string,
  bytes: Buffer,
): FreshDirectQuoteSigningRequestV1 {
  return {
    signature_scheme: "ed25519-spki-sha256-v1",
    signature_domain:
      role === "provider"
        ? "VOID_AUTHENTICATED_PAID_WORK_DIRECT_PROVIDER_AUTHENTICATION_V1"
        : "VOID_AUTHENTICATED_PAID_WORK_DIRECT_REQUESTER_AUTHENTICATION_V1",
    canonicalization: "void-canonical-json-v1",
    key_id: keyId,
    signing_bytes_base64: bytes.toString("base64"),
    signing_bytes_sha256: sha256Hex(bytes),
    signing_bytes_length: bytes.length,
  };
}

export function noFreshDirectQuoteAuthorityV1(): FreshDirectQuoteNoAuthorityV1 {
  return {
    quote_acceptance: false,
    acceptance_persistence: false,
    payment_authorization: false,
    payment_execution: false,
    work_execution_authorization: false,
    work_dispatch: false,
    wallet_access: false,
    production_signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    payment_receipt_creation: false,
    work_credit_write: false,
    void_settlement: false,
    http_submission: false,
    runtime_mutation: false,
    service_restart: false,
    deployment: false,
    money_movement: false,
  };
}

export function freshDirectQuoteProviderHandoffIdV1(
  value: FreshDirectQuoteProviderHandoffWithoutIdV1,
): string {
  return `${PROVIDER_HANDOFF_ID_PREFIX}${sha256Hex(canonicalJson(value))}`;
}

export function freshDirectQuoteRequesterHandoffIdV1(
  value: FreshDirectQuoteRequesterHandoffWithoutIdV1,
): string {
  return `${REQUESTER_HANDOFF_ID_PREFIX}${sha256Hex(canonicalJson(value))}`;
}

export function freshDirectQuoteFinalHandoffIdV1(
  value: FreshDirectQuoteFinalHandoffWithoutIdV1,
): string {
  return `${FINAL_HANDOFF_ID_PREFIX}${sha256Hex(canonicalJson(value))}`;
}

export function validateFreshDirectQuoteExternalSignatureV1(
  value: unknown,
  role: FreshDirectQuoteSignerRoleV1,
  signing: FreshDirectQuoteSigningRequestV1,
): FreshDirectQuoteExternalSignatureV1 {
  rejectFreshDirectQuoteSecretMaterialV1(value, `${role}_signature`);
  const root = requireFreshDirectQuoteRecordV1(
    value,
    `${role}_signature`,
  );
  requireFreshDirectQuoteExactKeysV1(root, `${role}_signature`, [
    "marker",
    "version",
    "signer_role",
    "key_id",
    "signing_bytes_sha256",
    "signature_base64",
  ]);
  freshDirectQuoteAssertV1(
    root.marker === FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
    `${role} signature marker mismatch`,
  );
  freshDirectQuoteAssertV1(
    root.version === 1,
    `${role} signature version mismatch`,
  );
  freshDirectQuoteAssertV1(
    root.signer_role === role,
    `${role} signer role mismatch`,
  );
  const keyId = requireFreshDirectQuoteStringV1(
    root.key_id,
    `${role} signature key_id`,
    KEY_ID,
    72,
    72,
  );
  freshDirectQuoteAssertV1(
    keyId === signing.key_id,
    `${role} signature key mismatch`,
  );
  const signingBytesSha256 = requireFreshDirectQuoteStringV1(
    root.signing_bytes_sha256,
    `${role} signing_bytes_sha256`,
    SHA256,
    64,
    64,
  );
  freshDirectQuoteAssertV1(
    signingBytesSha256 === signing.signing_bytes_sha256,
    `${role} signing bytes mismatch`,
  );
  const signatureBase64 = requireFreshDirectQuoteStringV1(
    root.signature_base64,
    `${role} signature_base64`,
    SIGNATURE,
    88,
    88,
  );
  const decoded = Buffer.from(signatureBase64, "base64");
  freshDirectQuoteAssertV1(
    decoded.length === 64 && decoded.toString("base64") === signatureBase64,
    `${role} signature is not canonical Ed25519 base64`,
  );
  return {
    marker: FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
    version: 1,
    signer_role: role,
    key_id: keyId,
    signing_bytes_sha256: signingBytesSha256,
    signature_base64: signatureBase64,
  };
}
