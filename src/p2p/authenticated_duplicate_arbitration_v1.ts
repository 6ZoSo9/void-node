// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";

export type VoidAuthenticatedDuplicateDirectionV1 = "inbound" | "outbound";

export type VoidAuthenticatedDuplicateRouteV1 = Readonly<{
  direction: VoidAuthenticatedDuplicateDirectionV1;
  connection_id: string;
}>;

export type VoidAuthenticatedDuplicateDecisionV1 = Readonly<{
  winner: "existing" | "candidate";
  reason:
    | "preferred_direction"
    | "same_direction_connection_id"
    | "same_connection_identity";
  preferred_direction: VoidAuthenticatedDuplicateDirectionV1;
  winning_connection_id: string;
}>;

const CHALLENGE_RE_V1 = /^[0-9a-f]{64}$/;
const CONNECTION_ID_RE_V1 = /^[0-9a-f]{64}$/;
const CONNECTION_ID_DOMAIN_V1 =
  "VOID_P2P_AUTHENTICATED_DUPLICATE_CONNECTION_ID_V1";

function canonicalNodeIdV1(raw: unknown, label: string): string {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(value)) {
    throw new Error(`VOID_P2P_DUPLICATE_ARBITRATION_V1: invalid ${label} node id`);
  }
  return value;
}

function canonicalDirectionV1(
  raw: unknown,
  label: string,
): VoidAuthenticatedDuplicateDirectionV1 {
  if (raw !== "inbound" && raw !== "outbound") {
    throw new Error(
      `VOID_P2P_DUPLICATE_ARBITRATION_V1: invalid ${label} direction`,
    );
  }
  return raw;
}

function canonicalChallengeV1(raw: unknown, label: string): string {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!CHALLENGE_RE_V1.test(value)) {
    throw new Error(
      `VOID_P2P_DUPLICATE_ARBITRATION_V1: invalid ${label} challenge`,
    );
  }
  return value;
}

function canonicalConnectionIdV1(raw: unknown, label: string): string {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!CONNECTION_ID_RE_V1.test(value)) {
    throw new Error(
      `VOID_P2P_DUPLICATE_ARBITRATION_V1: invalid ${label} connection id`,
    );
  }
  return value;
}

export function preferredAuthenticatedDuplicateDirectionV1(
  localNodeId: unknown,
  remoteNodeId: unknown,
): VoidAuthenticatedDuplicateDirectionV1 {
  const local = canonicalNodeIdV1(localNodeId, "local");
  const remote = canonicalNodeIdV1(remoteNodeId, "remote");
  if (local === remote) {
    throw new Error("VOID_P2P_DUPLICATE_ARBITRATION_V1: self identity collision");
  }

  // The lower authenticated node id owns the outbound half. The higher id owns
  // the corresponding inbound half. Both endpoints therefore choose the same
  // physical TCP connection independently during simultaneous dial.
  return local < remote ? "outbound" : "inbound";
}

export function authenticatedDuplicateConnectionIdV1(
  localChallenge: unknown,
  remoteChallenge: unknown,
): string {
  const local = canonicalChallengeV1(localChallenge, "local");
  const remote = canonicalChallengeV1(remoteChallenge, "remote");
  const [challengeA, challengeB] =
    local < remote ? [local, remote] : [remote, local];

  // Each endpoint sees the same two authenticated HELLO challenges in reverse
  // order. Sorting before hashing creates one physical-connection identity
  // without relying on NAT-sensitive socket tuples or endpoint timing.
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        domain: CONNECTION_ID_DOMAIN_V1,
        challenge_a: challengeA,
        challenge_b: challengeB,
      }),
      "utf8",
    )
    .digest("hex");
}

export function decideAuthenticatedDuplicateConnectionV1(
  localNodeId: unknown,
  remoteNodeId: unknown,
  existingInput: VoidAuthenticatedDuplicateRouteV1,
  candidateInput: VoidAuthenticatedDuplicateRouteV1,
): VoidAuthenticatedDuplicateDecisionV1 {
  const preferredDirection = preferredAuthenticatedDuplicateDirectionV1(
    localNodeId,
    remoteNodeId,
  );
  const existing = {
    direction: canonicalDirectionV1(existingInput?.direction, "existing"),
    connection_id: canonicalConnectionIdV1(
      existingInput?.connection_id,
      "existing",
    ),
  };
  const candidate = {
    direction: canonicalDirectionV1(candidateInput?.direction, "candidate"),
    connection_id: canonicalConnectionIdV1(
      candidateInput?.connection_id,
      "candidate",
    ),
  };

  if (existing.direction !== candidate.direction) {
    const winner =
      existing.direction === preferredDirection ? "existing" : "candidate";
    return Object.freeze({
      winner,
      reason: "preferred_direction",
      preferred_direction: preferredDirection,
      winning_connection_id:
        winner === "existing"
          ? existing.connection_id
          : candidate.connection_id,
    });
  }

  if (existing.connection_id === candidate.connection_id) {
    // Preserve the already-mounted route on the impossible/collision boundary.
    // Replacing it would add churn without adding a distinct connection.
    return Object.freeze({
      winner: "existing",
      reason: "same_connection_identity",
      preferred_direction: preferredDirection,
      winning_connection_id: existing.connection_id,
    });
  }

  // Authentication order can differ at the two endpoints. Selecting the
  // lexicographically lower symmetric connection identity makes both endpoints
  // retain the same physical socket even for same-direction duplicates.
  const winner =
    candidate.connection_id < existing.connection_id
      ? "candidate"
      : "existing";
  return Object.freeze({
    winner,
    reason: "same_direction_connection_id",
    preferred_direction: preferredDirection,
    winning_connection_id:
      winner === "existing"
        ? existing.connection_id
        : candidate.connection_id,
  });
}
