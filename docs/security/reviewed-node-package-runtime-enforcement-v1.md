# Reviewed Node package runtime — enforcement lock V1

## Outcome

Accept the exact combined package-runtime identity derived byte-for-byte on
Node 22, 24 and 26 by #2912. The accepted candidate lineage includes the
source-parent authentication repair at exact #2912 head `53cdbf01cd7f32410af1b102ee674198bf6278e5`.

Accepted identity:

- roots: `ethers`, `express`;
- profile ID:
  `voidrnpr1_c15b7f3cb00d85f378a69cfc536c3845e29f9be7047e3af0f9fbd646eb2f5860`;
- packages aggregate:
  `5eb57ae9bfa6a0f195d5ccf40697985f0043456057525c3fdca7f4c894173561`;
- package count: 82;
- file count: 2,498;
- total bytes: 21,267,803.

The compact identity pins the full profile through the profile content ID and
aggregate. The permanent proof independently recollects the complete lockfile-
derived package profile and requires all counts, metadata identities and root
versions to match. It then materializes the exact profile into a private
permission-fenced runtime and proves both `express` and `ethers` resolve
from that private tree without ancestor package fallback.

## Current-generation boundary

This is the current pre-#2865 package generation:

- Express 4.22.2;
- ethers 6.17.0;
- package-lock blob
  `b2671f0149f522b2489247016df0a5ec4bb72b8b`.

Any package metadata change invalidates the lock. Draft #2865 proposes a
different security-remediated generation and therefore supersedes this identity
if it lands.

## Authority

This lock establishes package-runtime **identity**, not whole enforcement or
production authority.

It keeps:

- `complete_executable_closure_verified=false`;
- `deployed_artifact_generation_verified=false`;
- `runtime_mount_authority=false`;
- `production_source_finality_authority_ready=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

No live service, credential, wallet/signer, RPC/payment, transaction,
Chain-2050/WC, inventory/treasury/liquidity or presale/market action occurs.

**PROTECT THE CORE.**
