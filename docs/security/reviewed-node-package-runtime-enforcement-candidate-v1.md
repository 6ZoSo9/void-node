# Reviewed Node package runtime — enforcement candidate V1

## Purpose

Derive the exact installed JavaScript package-byte closure required by current
Buy VOID enforcement candidate #2911.

#2911 proves the current static runtime graph has exactly two non-builtin package
imports:

- `ethers`;
- `express`.

The existing reviewed V1 package profile binds `ethers` only. This lane uses
the same reviewed package collector without weakening it and derives an
**unaccepted candidate** rooted at exactly `["ethers","express"]`.

## Current package generation

This candidate is explicitly bound to the current pre-#2865 metadata:

- package.json Git blob
  `f28c3e9446c7623ef203da36a9642d046e5f34ee`;
- package-lock.json Git blob
  `b2671f0149f522b2489247016df0a5ec4bb72b8b`;
- `ethers@6.17.0`;
- `express@4.22.2`.

The collector recursively derives all required/installed optional dependencies
from lockfile v3. No transitive package list or hash is hand-authored.

The candidate is self-authenticating for its declared source parent. It pins
the reviewed absolute-Git helper and requires
`21773007311f63c7a2e5d288e8bfa1e2243d49b6` to be an ancestor of the exact
current HEAD before emitting `source_parent`. The package collector separately
requires a canonical clean repository and exact HEAD metadata blobs.

Dependency Draft #2865 is an Amber semantic neighbor and proposes a different
package generation, including Express 4.22.3. If #2865 lands, this candidate
becomes historical and must not be relabeled as current package authority.

## Three-node derivation

Node 22, 24 and 26 each:

1. perform `npm ci --ignore-scripts --no-audit --no-fund`;
2. re-enforce the existing reviewed ethers-only profile;
3. collect the exact combined ethers+express package closure;
4. require current root package versions and metadata Git blobs;
5. emit a complete unaccepted profile candidate.

The cross-node job requires byte-for-byte equality of all three candidate
envelopes.

## Authority boundary

The candidate keeps:

- `profile_candidate_accepted=false`;
- `enforcement_candidate_identity_accepted=false`;
- `complete_executable_closure_verified=false`;
- `deployed_artifact_generation_verified=false`;
- `runtime_mount_authority=false`;
- `production_source_finality_authority_ready=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

A green result is evidence for a separately reviewed profile-lock step. It is
not itself an accepted package runtime and does not authorize service/runtime,
credentials, wallet/signer, RPC, payment, transaction, Chain-2050/WC,
inventory/treasury/liquidity, presale/market or funds action.

**PROTECT THE CORE.**
