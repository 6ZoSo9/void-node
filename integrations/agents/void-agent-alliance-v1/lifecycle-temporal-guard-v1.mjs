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
 * Verifies member-signed lifecycle continuity and adds registry-facing temporal
 * invariants. Candidate-to-active promotion is deliberately excluded because
 * active membership additionally requires a separate sovereign-admission
 * authorization verified by sovereign-admission-guard-v1.
 *
 * This guard prevents a member from:
 * - self-promoting a candidate to active membership;
 * - issuing a successor before the predecessor became effective;
 * - moving a successor's effective time behind the predecessor; or
 * - extending lifecycle expiry while changing status.
 *
 * Expiry may remain unchanged or be shortened. The function does not consult a
 * wall clock and does not prove that either manifest is currently unexpired.
 */
export function verifyAllianceMembershipTransitionTemporalGuardV1(
  previousValue,
  nextValue,
  publicKey,
) {
  const previous = validateAllianceMembershipManifestV1(previousValue, {
    verifyManifestId: true,
  });
  const next = validateAllianceMembershipManifestV1(nextValue, {
    verifyManifestId: true,
  });

  if (previous.lifecycle.status === "candidate" &&
      next.lifecycle.status === "active") {
    fail("candidate_activation_requires_sovereign_admission_guard");
  }

  verifyAllianceMembershipTransitionV1(previous, next, publicKey);

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
