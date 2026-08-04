import {
  validateAllianceMembershipManifestV1,
  verifyAllianceMembershipTransitionV1,
} from "./index.mjs";

function fail(message) {
  throw new Error(message);
}

function parseInstant(value, label) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) fail(`${label}_invalid`);
  return time;
}

function lifecycleAnchor(manifest) {
  return parseInstant(
    manifest.lifecycle.effective_at ?? manifest.lifecycle.issued_at,
    "lifecycle_anchor",
  );
}

/**
 * Verifies the signed membership transition and adds registry-facing temporal
 * invariants that the core lifecycle verifier deliberately keeps separate.
 *
 * The guard prevents a member from:
 * - issuing a successor before the predecessor became effective;
 * - moving a successor's effective time behind the predecessor; or
 * - extending the lifecycle expiry while changing status.
 *
 * Expiry may remain unchanged or be shortened. The function does not consult a
 * wall clock and does not prove that either manifest is currently unexpired.
 */
export function verifyAllianceMembershipTransitionTemporalGuardV1(
  previousValue,
  nextValue,
  publicKey,
) {
  verifyAllianceMembershipTransitionV1(previousValue, nextValue, publicKey);

  const previous = validateAllianceMembershipManifestV1(previousValue, {
    verifyManifestId: true,
  });
  const next = validateAllianceMembershipManifestV1(nextValue, {
    verifyManifestId: true,
  });

  const previousAnchor = lifecycleAnchor(previous);
  const nextIssuedAt = parseInstant(next.lifecycle.issued_at, "next_issued_at");
  const nextEffectiveAt = parseInstant(
    next.lifecycle.effective_at,
    "next_effective_at",
  );
  const previousExpiresAt = parseInstant(
    previous.lifecycle.expires_at,
    "previous_expires_at",
  );
  const nextExpiresAt = parseInstant(next.lifecycle.expires_at, "next_expires_at");

  if (nextIssuedAt < previousAnchor) {
    fail("transition_issued_before_previous_effective_time");
  }
  if (nextEffectiveAt <= previousAnchor) {
    fail("transition_effective_time_not_strictly_after_previous_state");
  }
  if (nextExpiresAt > previousExpiresAt) {
    fail("transition_expires_at_extension_rejected");
  }

  return true;
}
