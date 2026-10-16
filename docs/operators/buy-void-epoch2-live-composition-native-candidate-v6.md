# Buy VOID Epoch-2 live-composition native candidate v6

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_V6`

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

V6 is the fresh deterministic native/runner candidate for the repaired V3
composition stack after #3296/#3297 corrected parent abnormal-child receipt truth.

Its source-generation anchor is exact reconciled native-preentry head:

`5deec4ea5126ef657e0ae0e4a212423f9438e0a2`.

The candidate does not reuse or repin the affected accepted V4 candidate/lock.
It derives a new identity from #3297's repaired V3 native source and the same
reviewed V3 composition runner.

## Exact trust root

- V3 native preentry:
  `ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c`
  — Git blob `5021727f1def1ec11f870d735cab65acc1701a5e`;
- repaired V3 composition runner:
  `ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs`
  — Git blob `499df9b94b5b89354837570da0c7e47ec280025d`;
- reconciled V3 native source proof:
  `scripts/prove_buy_void_epoch2_live_composition_native_preentry_v3_source.py`
  — Git blob `b48972c0f930f5a33754a390bd2289853fc93c93`;
- reconciled V3 source workflow:
  `.github/workflows/buy-void-epoch2-live-composition-native-preentry-v3-source.yml`
  — Git blob `428bd68439ab5b7251632107839346d6b18fc769`;
- sealed Epoch-2 credential probe V2:
  `scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs`
  — Git blob `14cbe81e27d04fee77cbe75225ce308bf8561a7b`.

## Deterministic static build

The candidate preserves the reviewed static/non-PIE recipe:

```text
compile:
/usr/bin/cc
  -std=c11 -Wall -Wextra -Werror -O2 -fno-ident -fno-pie
  -c SOURCE -o OBJECT

link:
/usr/bin/cc
  -static -fno-pie -no-pie -Wl,--build-id=none
  -Wl,-t,-t OBJECT -o ELF

strip:
/usr/bin/strip --strip-all ELF

SOURCE_DATE_EPOCH=0
```

The resulting candidate must be ELF64 x86-64 executable type, statically linked
and contain no `PT_INTERP`.

## Complete build provenance

The V6 report retains the existing complete static-build closure:

- real compiler driver plus `cc1`, assembler, `collect2`, linker and strip;
- active GCC specs and search-directory hashes;
- preprocessed translation-unit identity;
- compile-object identity;
- closed ordered linker trace;
- every traced regular linker input/static archive;
- archive/member records and exact member names;
- normalized raw trace identity with an explicit candidate-object placeholder;
- two local builds required to be byte-identical.

Unknown linker records and unreadable/non-regular inputs HOLD.

## Independent hosted equality

Three Ubuntu 24.04 derive lanes produce canonical candidate reports. An
independent compare job requires byte-identical reports and then independently
re-preprocesses, recompiles, relinks and strips the exact source, requiring the
ELF, toolchain closure, runner and trust root to match.

The hostile-loader control is also retained: a dynamic positive control must
execute an injected `LD_PRELOAD` constructor while the static native preentry
must run its exact V3 self-test without triggering it.

## Authority

A GREEN V6 candidate remains unaccepted:

```text
candidate_accepted=false
native_binary_identity_accepted=false
runner_identity_accepted=false
protected_install_authorized=false
live_execution_authorized=false
credential_access=false
private_key_access=false
signing_authorized=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
funds_movement=false
```

No Precision install, credential read, signature, transaction, RPC, service
mutation, presale/WC activation, treasury action or funds movement occurs.

The next gate is a separately reviewed V6 candidate acceptance lock.

PROTECT THE CORE.
