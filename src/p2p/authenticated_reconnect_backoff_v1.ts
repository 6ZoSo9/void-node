// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

export const VOID_P2P_AUTHENTICATED_RECONNECT_MIN_BACKOFF_MS_V1 = 500;
export const VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1 = 15_000;
export const VOID_P2P_AUTHENTICATED_SESSION_STABLE_MS_V1 = 30_000;

export type VoidP2PAuthenticatedReconnectDecisionV1 = Readonly<{
  delay_ms: number;
  next_backoff_ms: number;
  authenticated_duration_ms: number | null;
  stable_authenticated_session: boolean;
  previous_backoff_valid: boolean;
  authenticated_timestamp_valid: boolean;
}>;

function exactNonnegativeSafeIntegerV1(raw: unknown): number | undefined {
  return (
    typeof raw === "number" &&
    Number.isSafeInteger(raw) &&
    raw >= 0
  )
    ? raw
    : undefined;
}

export function decideVoidP2PAuthenticatedReconnectV1(
  input: Readonly<{
    previousBackoffMs?: unknown;
    authenticatedAtMs?: unknown;
    closedAtMs: unknown;
  }>,
): VoidP2PAuthenticatedReconnectDecisionV1 {
  const closedAtMs = exactNonnegativeSafeIntegerV1(input?.closedAtMs);
  if (closedAtMs === undefined) {
    throw new Error(
      "VOID_P2P_AUTHENTICATED_RECONNECT_BACKOFF_V1: invalid close timestamp",
    );
  }

  const previousWasAbsent = input.previousBackoffMs === undefined;
  const previous = exactNonnegativeSafeIntegerV1(input.previousBackoffMs);
  const previousBackoffValid =
    previousWasAbsent ||
    (
      previous !== undefined &&
      previous >= VOID_P2P_AUTHENTICATED_RECONNECT_MIN_BACKOFF_MS_V1 &&
      previous <= VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1
    );

  // No prior generation starts at the minimum. Corrupt/out-of-range internal
  // state fails slow at the maximum rather than recreating a tight loop.
  const boundedPrevious = previousWasAbsent
    ? VOID_P2P_AUTHENTICATED_RECONNECT_MIN_BACKOFF_MS_V1
    : previousBackoffValid
      ? previous!
      : VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1;

  const authenticatedAtMs =
    exactNonnegativeSafeIntegerV1(input.authenticatedAtMs);
  const authenticatedTimestampValid =
    input.authenticatedAtMs === undefined ||
    (
      authenticatedAtMs !== undefined &&
      authenticatedAtMs <= closedAtMs
    );
  const authenticatedDurationMs =
    authenticatedAtMs !== undefined && authenticatedAtMs <= closedAtMs
      ? closedAtMs - authenticatedAtMs
      : null;
  const stableAuthenticatedSession =
    authenticatedDurationMs !== null &&
    authenticatedDurationMs >=
      VOID_P2P_AUTHENTICATED_SESSION_STABLE_MS_V1;

  // Authentication alone is not liveness. Only a session that remained
  // authenticated for the stability window earns a reset to the minimum.
  const delayMs = stableAuthenticatedSession
    ? VOID_P2P_AUTHENTICATED_RECONNECT_MIN_BACKOFF_MS_V1
    : boundedPrevious;
  const nextBackoffMs = Math.min(
    delayMs * 2,
    VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
  );

  return Object.freeze({
    delay_ms: delayMs,
    next_backoff_ms: nextBackoffMs,
    authenticated_duration_ms: authenticatedDurationMs,
    stable_authenticated_session: stableAuthenticatedSession,
    previous_backoff_valid: previousBackoffValid,
    authenticated_timestamp_valid: authenticatedTimestampValid,
  });
}
