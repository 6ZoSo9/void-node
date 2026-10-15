# Buy VOID Epoch-2 live composition native candidate v1

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_V1`.

Status: **reproducible candidate only; unaccepted, uninstalled and not live-authorized**.

## Purpose

Derive one deterministic installable pair from the current #3184 privileged
first-entry source generation:

- static native preentry source blob
  `525dbf7c6ac36ee24bac75c009c03856feab0fdc`;
- V2 runner source blob
  `8241a7172284381295b70bd55f5af3328b03605a`.

The parent source proof is
`4928b24eb83be6712c7711cd76caf7b0b5ba98b5` and requires a static native
first instruction, no `PT_INTERP`, and an `LD_PRELOAD` positive-control
adversary.

## Candidate recipe

Three independent Ubuntu 24.04 jobs:
- re-run the full source trust proof;
- compile the native source with warnings-as-errors, static link,
  `SOURCE_DATE_EPOCH=0`, no compiler ident and no linker build-id;
- strip the native binary;
- require no dynamic interpreter;
- run native self-test;
- copy the exact runner source bytes with future installed mode `0444`;
- run runner self-test and inert plan;
- emit exact binary/runner/toolchain metadata.

All three jobs must produce byte-identical native, runner and metadata files.

## Deliberately deferred host policy

The candidate does **not** predeclare the future installed policy's
`expected_head` or the exact Precision `/usr/bin/node` identity.

Those are live-host generation facts and must be bound later by a separately
reviewed install plan immediately before protected publication.

The later policy must require:
- its expected head to match the selected current main generation;
- exact installed runner identity equal to this accepted candidate;
- exact current root-owned Node bytes/SHA and size;
- exact root-owned/non-writable filesystem custody.

## Authority

This candidate remains:
- `candidate_accepted=false`;
- `install_authorized=false`;
- `live_execution_authorized=false`;
- `credential_access=false`;
- `private_key_access=false`;
- `transaction=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `funds_movement=false`.

No Precision install, credential read, signing, transaction, payment,
activation or funds movement occurs.

PROTECT THE CORE.
