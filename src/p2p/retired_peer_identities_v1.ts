// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

// Source-reviewed P2P trust revocations. Never load this list from
// unauthenticated PEERS messages, runtime environment, or mutable cache.
export type VoidRetiredP2PIdentityV1 = Readonly<{
  node_id: string;
  reason: string;
}>;

// A revoked P2P identity is not a wallet, validator, or transaction signer.
// Additions require source review; removal requires a separate explicit review.
export const VOID_RETIRED_P2P_IDENTITIES_V1: readonly VoidRetiredP2PIdentityV1[] =
  Object.freeze([
    Object.freeze({
      node_id: "4f93300760f94834139babd2b54d2619",
      reason: "railway-introducer-retired-after-2026-10-21-railway-incident",
    }),
  ]);

const retiredIds = new Set<string>();
for (const entry of VOID_RETIRED_P2P_IDENTITIES_V1) {
  if (
    !/^[0-9a-f]{32}$/.test(entry.node_id) ||
    !/^[a-z0-9-]{1,128}$/.test(entry.reason) ||
    retiredIds.has(entry.node_id)
  ) {
    throw new Error("invalid source-reviewed retired P2P identity policy");
  }
  retiredIds.add(entry.node_id);
}

// Exact node-ID comparison. Do not revoke arbitrary peers by shared IP,
// provider hostname, account name, or unauthenticated claimed address.
export function isVoidRetiredP2PNodeIdV1(id: unknown): boolean {
  return typeof id === "string" && retiredIds.has(id);
}
