# Buy VOID Epoch-2 live-composition native candidate v3

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_V3`

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

This is the candidate successor required by the exact-head HOLD recorded on
merged #3200.

It is stacked on the #3204 proof-completeness generation:

`a1a4a1b8e7f508dbd13628d28c32514a1632041a`

The candidate binds the unchanged privileged implementation plus the repaired
proof generation. It does not reuse #3200's weak `cc_sha256 + strip_sha256`
claim as complete build provenance.

## Exact trust root

The derivation requires these Git objects:

- native preentry:
  `ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c`
  — `4aa091e7835b32aa5c4e7b8e4059651c69a64eb3`;
- V2 root runner:
  `ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs`
  — `92e8c8696ea7e2bb81b6ef089db8baa657188935`;
- repaired privileged-source proof:
  `scripts/prove_buy_void_epoch2_live_composition_native_preentry_v1.mjs`
  — `c07773c2d1e365b408ef2e5f859e0dfbf4fdbd88`;
- privileged-source workflow:
  `.github/workflows/buy-void-epoch2-live-composition-native-preentry-v1.yml`
  — `85c28fdf03345240332cbf41d46fbda065958ec7`;
- sealed credential V2:
  `scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs`
  — `14cbe81e27d04fee77cbe75225ce308bf8561a7b`.

The source-proof job must independently rerun the repaired #3204 proof before
candidate derivation proceeds.

## Compile recipe

The native source uses the same intended static/non-PIE production candidate
recipe as the historical V2 derivation, split into explicit compile and link
phases so the build closure can be observed:

```text
compile:
/usr/bin/cc
  -std=c11 -Wall -Wextra -Werror -O2 -fno-ident -fno-pie
  -c SOURCE -o OBJECT

link:
/usr/bin/cc
  -static -fno-pie -no-pie -Wl,--build-id=none
  -Wl,-t OBJECT -o ELF

strip:
/usr/bin/strip --strip-all ELF

SOURCE_DATE_EPOCH=0
```

The candidate still requires ELF64 x86-64 executable type, static linkage and
no `PT_INTERP`.

## Complete observed static-build provenance

V3 uses the repository's already-reviewed static-preentry closure pattern from
Apollyon #3048 rather than treating the compiler driver as the toolchain.

Every report binds:

- canonical path, byte length and SHA-256 for the real `cc` driver;
- the resolved `cc1`, assembler, `collect2`, and linker executables;
- the exact `/usr/bin/strip` generation;
- SHA-256 of active GCC specs;
- SHA-256 of active GCC search directories;
- SHA-256 + byte length of the preprocessed translation unit, binding effective
  system-header content;
- SHA-256 + byte length of the compiled object before linking;
- canonical path, byte length and SHA-256 for every regular startup object,
  static archive or other file observed by the linker's `-t` trace, excluding
  only the candidate's own temporary object.

Any absolute pathname emitted by the linker trace is fail-closed: if it cannot
be resolved and hashed as a regular file, derivation fails rather than silently
omitting that observed input from the closure.

The source is compiled twice in each derive lane. Binary bytes, ELF inspection,
compiled-object identity and link-input closure must be identical.

## Independent hosted comparison

Three Ubuntu 24.04 derive lanes emit canonical `candidate.json` files.

The compare job:

1. requires all three candidate reports to be byte-identical;
2. validates every recorded toolchain/link-input file against the compare
   runner;
3. independently preprocesses, recompiles, relinks and strips the exact source;
4. requires the rederived ELF, object identity, complete toolchain closure,
   runner identity and trust-root identities to equal the hosted report.

This is stronger than three jobs merely agreeing on output bytes while sharing
an unbound build environment.

## Loader-before-main control

As in the reviewed #3048 pattern, the proof builds a temporary dynamic control
plus hostile `LD_PRELOAD` constructor.

The dynamic control must execute the constructor. The static Epoch-2 preentry
must then execute its exact inert self-test under the same hostile environment
without triggering the constructor.

## Runner identity

The V2 runner is not compiled by this candidate. Its exact Git object, byte
length and SHA-256 are included in the candidate report with future install
mode `0444`.

The candidate deliberately does **not** bind the eventual Precision
`/usr/bin/node` generation. That remains a host-bound protected-policy/install
gate, matching the native preentry contract.

## Authority

Even a fully green V3 candidate remains:

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

No live Precision install, credential read, key access, signing, transaction,
payment acceptance, presale/WC activation, service mutation, treasury/liquidity
action or funds movement occurs in this lane.

Only after exact hosted V3 derivation and independent comparison settle may a
separate lock successor consider changing candidate/native/runner acceptance
bits.

PROTECT THE CORE.
