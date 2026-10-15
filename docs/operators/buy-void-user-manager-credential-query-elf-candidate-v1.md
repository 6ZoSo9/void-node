# Buy VOID credential-unit query ELF candidate v1

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_CANDIDATE_V1`.

Status: **reproducible binary candidate only; unaccepted and uninstalled**.

Parent source generation:

`a44308f094bc67841da2a7ce3eb22c36782318fe` (#3152 exact head).

Pinned source/proof identities:

- private manager peer guard:
  `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- authenticated credential-unit query:
  `e12e0b16df6e6eb5fd912a6dbf6ae970673246f9`;
- credential-query proof:
  `ec3803e766fd679eb53c84cc0b3d7069e33c2932`;
- credential-query static preexec:
  `0ccd2d07a951389d85a9fc56ec892a774d9dd681`;
- credential-preexec proof:
  `58df08ca966f4629893c3885f1df37c837762520`.

## Derivation

Three independent Ubuntu 24.04 jobs compile and strip the exact pair with one
reviewed command shape:

- static non-PIE preexec, no `PT_INTERP`;
- dynamic credential query linked only against the reviewed source closure and
  system `libdl`;
- `SOURCE_DATE_EPOCH=0`;
- `-fno-ident`;
- linker build ID disabled;
- exact `/usr/bin/cc` and `/usr/bin/strip` identities recorded.

Each job pins both accepted parent source-proof Git objects byte-for-byte but
does not rerun their exact-parent branch-scope or predecessor-lock assertions on
this successor generation. Current successor behavior is instead independently
compiled and exercised here: the stripped credential-query self-test runs in a
closed environment, and the stripped pair is installed into the disposable
fixed protected tree:

`/opt/void-buy-void-user-manager-credential-query-v1`.

A hostile `LD_PRELOAD` constructor is a positive control for unsafe direct
query launch and must not execute when the exact static preexec enters the
retained query descriptor.

The three jobs upload the exact ELFs plus one canonical metadata JSON. A separate
cross-job step requires byte equality for both ELFs and metadata across all
three derivations.

## Candidate boundary

A successful run proves only a reproducible candidate identity for the exact
source generation.

It does **not** accept the binary pair or authorize installation/live execution:

- `candidate_accepted=false`;
- `install_authorized=false`;
- `live_query_authorized=false`;
- `credential_contents_read=false`;
- `production_host_evidence_authority=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `transaction=false`;
- `funds_movement=false`.

A separate acceptance-lock successor must consume exact hosted artifact
identities before any protected installer can be reviewed.

The frozen credential source parent remains #3152 exact head `a44308f094bc67841da2a7ce3eb22c36782318fe`, which is independently source-reviewed and remains an ancestor of current main. This successor is clean-restacked on `main@7a83b0fb5d2bface8060aef1a1ecc41ca800b538`; its PR delta is exactly this workflow plus this document. The intervening canonical V6 qualifier/census commits are not part of the credential candidate scope. Candidate derivation still grants no protected install or live-query authority.

PROTECT THE CORE.
