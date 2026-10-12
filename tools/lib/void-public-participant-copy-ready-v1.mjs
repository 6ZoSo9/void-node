import {
  verifyReviewedVoidNodePublicOriginBindingV1,
} from "./void-public-node-identity-trust-v1.mjs";

export const VOID_PUBLIC_PARTICIPANT_COPY_READY_V1 =
  "VOID_PUBLIC_PARTICIPANT_COPY_READY_V1";
export const VOID_PUBLIC_PARTICIPANT_CANONICAL_ORIGIN_V1 =
  "https://seed.nullfeed.org";
export const VOID_PUBLIC_PARTICIPANT_ORIGIN_BINDING_PATH_V1 =
  "/.well-known/void-node-public-origin-binding-v1.json";

const NODE_ID_PATTERN = /^[0-9a-f]{32}$/u;

function hold(reason, healthNodeId, bindingHttpStatus) {
  return Object.freeze({
    marker: VOID_PUBLIC_PARTICIPANT_COPY_READY_V1,
    public_copy_ready: false,
    trust_mode: "hold",
    reason,
    coordinator_base: null,
    coordinator_node_id:
      typeof healthNodeId === "string"
      && NODE_ID_PATTERN.test(healthNodeId)
        ? healthNodeId
        : null,
    cryptographic_public_origin_binding_verified: false,
    trust_registry_sha256: null,
    trusted_public_key_fingerprint_sha256: null,
    binding: Object.freeze({
      path: VOID_PUBLIC_PARTICIPANT_ORIGIN_BINDING_PATH_V1,
      http_status:
        Number.isInteger(bindingHttpStatus)
          ? bindingHttpStatus
          : 0,
      binding_sha256: null,
      issued_at: null,
      expires_at: null,
      public_key_fingerprint_sha256: null,
    }),
  });
}

export function classifyVoidPublicParticipantCopyReadyV1({
  available,
  healthNodeId,
  bindingHttpStatus,
  bindingValue,
  nowMs = Date.now(),
  verifyBinding =
    verifyReviewedVoidNodePublicOriginBindingV1,
} = {}) {
  if (available !== true) {
    return hold(
      "public_earn_unavailable",
      healthNodeId,
      bindingHttpStatus,
    );
  }
  if (
    typeof healthNodeId !== "string"
    || !NODE_ID_PATTERN.test(healthNodeId)
  ) {
    return hold(
      "live_health_node_id_invalid",
      healthNodeId,
      bindingHttpStatus,
    );
  }
  if (
    bindingHttpStatus !== 200
    || !bindingValue
    || typeof bindingValue !== "object"
    || Array.isArray(bindingValue)
  ) {
    return hold(
      "signed_public_origin_binding_unavailable",
      healthNodeId,
      bindingHttpStatus,
    );
  }
  if (typeof verifyBinding !== "function") {
    return hold(
      "signed_public_origin_binding_verifier_unavailable",
      healthNodeId,
      bindingHttpStatus,
    );
  }

  let verified;
  try {
    verified = verifyBinding(bindingValue, {
      expectedOrigin:
        VOID_PUBLIC_PARTICIPANT_CANONICAL_ORIGIN_V1,
      expectedNodeId: healthNodeId,
      nowMs,
    });
  } catch {
    return hold(
      "signed_public_origin_binding_unverified",
      healthNodeId,
      bindingHttpStatus,
    );
  }

  if (
    verified?.origin
      !== VOID_PUBLIC_PARTICIPANT_CANONICAL_ORIGIN_V1
    || verified?.node_id !== healthNodeId
    || typeof verified?.binding_sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(verified.binding_sha256)
    || typeof verified?.public_key_fingerprint_sha256
      !== "string"
    || !/^[0-9a-f]{64}$/u.test(
      verified.public_key_fingerprint_sha256,
    )
  ) {
    return hold(
      "signed_public_origin_binding_identity_mismatch",
      healthNodeId,
      bindingHttpStatus,
    );
  }

  return Object.freeze({
    marker: VOID_PUBLIC_PARTICIPANT_COPY_READY_V1,
    public_copy_ready: true,
    trust_mode: "signed_public_origin_binding",
    reason:
      "trusted_available_coordinator_bound_to_signed_public_origin",
    coordinator_base:
      VOID_PUBLIC_PARTICIPANT_CANONICAL_ORIGIN_V1,
    coordinator_node_id: healthNodeId,
    cryptographic_public_origin_binding_verified: true,
    trust_registry_sha256:
      verified.trust_registry_sha256 || null,
    trusted_public_key_fingerprint_sha256:
      verified.public_key_fingerprint_sha256,
    binding: Object.freeze({
      path: VOID_PUBLIC_PARTICIPANT_ORIGIN_BINDING_PATH_V1,
      http_status: bindingHttpStatus,
      binding_sha256: verified.binding_sha256,
      issued_at: verified.issued_at || null,
      expires_at: verified.expires_at || null,
      public_key_fingerprint_sha256:
        verified.public_key_fingerprint_sha256,
    }),
  });
}
