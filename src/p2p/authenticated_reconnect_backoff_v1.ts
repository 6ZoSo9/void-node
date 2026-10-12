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
  authenticated_duration_valid: boolean;
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

function exactNonnegativeFiniteDurationV1(
  raw: unknown,
): number | undefined {
  return (
    typeof raw === "number" &&
    Number.isFinite(raw) &&
    raw >= 0 &&
    raw <= Number.MAX_SAFE_INTEGER
  )
    ? raw
    : undefined;
}

export function decideVoidP2PAuthenticatedReconnectV1(
  input: Readonly<{
    previousBackoffMs?: unknown;
    authenticatedDurationMs: unknown;
  }>,
): VoidP2PAuthenticatedReconnectDecisionV1 {
  const previousWasAbsent = input?.previousBackoffMs === undefined;
  const previous = exactNonnegativeSafeIntegerV1(
    input?.previousBackoffMs,
  );
  const previousBackoffValid =
    previousWasAbsent ||
    (
      previous !== undefined &&
      previous >= VOID_P2P_AUTHENTICATED_RECONNECT_MIN_BACKOFF_MS_V1 &&
      previous <= VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1
    );

  const boundedPrevious = previousWasAbsent
    ? VOID_P2P_AUTHENTICATED_RECONNECT_MIN_BACKOFF_MS_V1
    : previousBackoffValid
      ? previous!
      : VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1;

  const authenticatedDurationMs =
    exactNonnegativeFiniteDurationV1(
      input?.authenticatedDurationMs,
    );
  const authenticatedDurationValid =
    authenticatedDurationMs !== undefined;
  const stableAuthenticatedSession =
    authenticatedDurationValid &&
    authenticatedDurationMs >=
      VOID_P2P_AUTHENTICATED_SESSION_STABLE_MS_V1;

  // Authentication alone is not liveness. The runtime supplies elapsed time
  // from one monotonic process clock. Missing, negative, non-finite, or
  // otherwise corrupt elapsed evidence fails slow at the maximum.
  const delayMs = !authenticatedDurationValid
    ? VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1
    : stableAuthenticatedSession
      ? VOID_P2P_AUTHENTICATED_RECONNECT_MIN_BACKOFF_MS_V1
      : boundedPrevious;
  const nextBackoffMs = Math.min(
    delayMs * 2,
    VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
  );

  return Object.freeze({
    delay_ms: delayMs,
    next_backoff_ms: nextBackoffMs,
    authenticated_duration_ms:
      authenticatedDurationMs ?? null,
    stable_authenticated_session: stableAuthenticatedSession,
    previous_backoff_valid: previousBackoffValid,
    authenticated_duration_valid: authenticatedDurationValid,
  });
}
