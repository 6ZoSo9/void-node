// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

export type VoidAuthenticatedDuplicateDirectionV1 = "inbound" | "outbound";

function canonicalNodeIdV1(raw: unknown, label: string): string {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(value)) {
    throw new Error(`VOID_P2P_DUPLICATE_ARBITRATION_V1: invalid ${label} node id`);
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
