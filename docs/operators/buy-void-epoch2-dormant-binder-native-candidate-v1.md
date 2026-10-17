# Buy VOID Epoch-2 dormant V3R binder native candidate V1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V1`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

This is the deterministic native-preentry candidate gate for the repaired dormant
V3R binding source generation after #3358. It supersedes unmerged #3355, whose
candidate was pinned to the pre-#3358 failure-truth source generation.

It derives a static ELF for:

`ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c`

and binds the exact JavaScript binder bytes authenticated by that native first
entry.

## Exact source generation

Candidate derivation requires #3358 source head:

`e602fa5b4b6961e9c24d4bbdb60a6d006a2783b2`

merged as `326c809439f9df333a9c8b1b73ecb40901b0e1a1`, with canonical main parent:

`b9d44332fc3119ec7a534829502efcff364b1b00`.

Bound inherited blobs:

- native preentry:
  `4fdf3f627f407335b9d50800fbbc913d1edae523`;
- JavaScript binder:
  `9c29eb4716077e459b9154f39d0f30cf2e56729f`;
- binding proof:
  `4671d37fcdb43c2bee9d3de16402df0cd25257bb`;
- binding operator contract:
  `cd90bafa39682284a6d9e87daebfe5966adac8d6`;
- focused source workflow:
  `2742145ab88d721747f978927a6eb64a7c5f805f`.

The binder must also remain exactly 39,391 bytes with SHA-256:

`afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e`.

## Hosted derivation

Three independent Ubuntu 24.04 lanes must produce byte-identical:

- stripped static native-preentry ELF;
- canonical candidate report.

The report binds:

- exact source/binder Git identities and bytes;
- preprocessed translation-unit identity;
- compiler, cc1, assembler, collect2, linker and strip identities;
- key static-link inputs;
- normalized linker-trace digest;
- candidate object identity;
- final ELF size/SHA-256;
- exact self-test transcript;
- ELF64/x86-64 executable shape;
- absence of PT_INTERP;
- hostile LD_PRELOAD positive control and static-preentry immunity;
- two local builds byte-identical.

A separate compare job requires all three hosted results to match and
independently rederives the report and ELF once more.

## Authority

Candidate evidence only.

- `candidate_accepted=false`;
- `native_binary_identity_accepted=false`;
- `protected_install_authorized=false`;
- `live_execution_authorized=false`;
- `credential_access=false`;
- `private_key_access=false`;
- `signing_authorized=false`;
- `transaction=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `funds_movement=false`;
- `production_host_evidence_authority=false`.

No Precision installation, live binder execution, credential/key access,
signing, RPC, transaction, payment, presale/WC activation or funds movement.

A separate acceptance-lock generation is required after hosted candidate
evidence settles.

PROTECT THE CORE.
