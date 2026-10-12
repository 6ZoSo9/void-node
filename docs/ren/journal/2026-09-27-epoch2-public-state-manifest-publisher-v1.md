# 2026-09-27 — Epoch-2 Public State Manifest Publisher V1

Marker: `VOID_REN_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1`

The successor migration still lacks public availability of the exact
client-neutral state manifest. Hash-only migration summaries are not enough.

This lane stages a fail-closed local publisher for the already-proven non-secret
manifest. The publisher can only write the exact file SHA-256
`affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9`
with embedded material identity
`286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f`.

It requires explicit publication confirmation and leaves
`successor_genesis_or_state_manifest_public_evidence_ready=false` until the
artifact is actually committed and routed publicly.

Post-review hardening adds an inert self-test profile inside the tool and
executes the real publication core against temporary repositories. The proof
now covers first create, idempotent `already_exact`, conflicting existing
target rejection, exact post-write bytes, and unchanged false activation gates.
Production constants remain hard-pinned and no generic profile override is
exported.

No credential/key access or live-value authority is introduced.
