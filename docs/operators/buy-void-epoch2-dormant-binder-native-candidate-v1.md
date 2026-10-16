# Buy VOID Epoch-2 dormant V3R binder native candidate V1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V1`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

This is the deterministic native-preentry candidate gate named by the dormant
V3R binding source generation in #3350.

It derives a static ELF for:

`ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c`

and binds the exact JavaScript binder bytes authenticated by that native first
entry.

## Exact source generation

Candidate derivation requires #3350 source head:

`c140cb497d07b067e65a0511a0c46370e3b3dbfe`

with canonical main parent:

`d9c5e611b32a0c99dd1f1f1956bb6174b2c8c19e`.

Bound inherited blobs:

- native preentry:
  `f2fcc922fa0679d781ec31e03a856486d1f2642a`;
- JavaScript binder:
  `9c29eb4716077e459b9154f39d0f30cf2e56729f`;
- binding proof:
  `4c9cf70fe7fa650ef490c636be005072dfc600c8`;
- binding operator contract:
  `bcd357f4b5d605dfedb04482f36f47b9a72ce7ca`;
- focused source workflow:
  `2b7a6662420cd3934aa0fc8cdc751ee9317cccdf`.

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
