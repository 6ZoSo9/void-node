# Epoch-2 public state evidence promotion v1

Marker: `VOID_EPOCH2_PUBLIC_STATE_EVIDENCE_PROMOTION_V1`

## What changed

The exact non-secret epoch-2 client-neutral state manifest is no longer only a
local operator artifact.

- PR #1936 merged the exact file at
  `public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json`.
- Canonical file SHA-256:
  `affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9`.
- Canonical material SHA-256:
  `286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f`.
- PR #1937 merged an exact GET/HEAD composition route pinned to those bytes and
  fail-closed on the manifest's non-authority boundary.
- The existing Precision recovery composition service was repointed from the
  historical recovery worktree to current `~/dev/void-node` without changing
  the 8080 adapter, node 4100, frontdoor, Funnel configuration, Tor, wallets,
  keys, transaction authority, or Chain-2050 state.
- The live loopback composition route and the existing Precision public Funnel
  both returned the exact canonical file SHA-256.

## Gate transition

Current successor candidate truth may now record:

`successor_genesis_or_state_manifest_public_evidence_ready=true`

The earlier content-addressed migration packet is intentionally not rewritten;
its embedded false value remains a historical snapshot from before exact state
artifact publication.

## Still HOLD

This promotion does not establish or authorize:

- `successor_state_root_public_void_anchor_ready`;
- `public_balance_receipt_code_verification_ready`;
- privileged-signer replay fencing;
- complete pending legacy signed-transaction census;
- cross-epoch replay protection;
- ceremony backup continuity;
- full offline successor equivalence;
- production validator/QBFT binding;
- migration;
- public activation; or
- funds movement.

Memory for context. Repo for truth. Brood journal for continuity.
