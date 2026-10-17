# Buy VOID Epoch-2 dormant-binder installer first-entry candidate V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_V2`.

Status: **source/CI-only reproducible candidate derivation; unaccepted and not installed**.

## Purpose

This gate derives the static launcher binary for runtime-head first-entry source
#3436.

V2 fixes the lifecycle deadlock in launcher V1 by removing repository HEAD from
the binary's compile-time authority. The candidate still binds exact installer,
native-candidate and confirmation identities.

It does not install or execute the launcher on Precision.

## Source generation

Exact launcher source:

- path:
  `ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_v2.c`;
- Git blob:
  `e3fc712709c8c3b56fbe1f7b2dc0d20ba0860dc5`.

Exact repaired Python installer dependency:

- Git blob:
  `f3d6b1559be7490303cf36338c4bfa38fdaa390a`.

The candidate proof also binds accepted dormant-binder native lock V3 and
independently rederives the accepted native ELF rather than trusting an old
downloaded binary.

Accepted native input remains:

- lock:
  `voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a`;
- candidate:
  `voidbuye2dormantbindercand2_8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d`;
- ELF bytes: `726976`;
- ELF SHA-256:
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`.

## Compile binding

Production defaults are preserved:

```text
/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v2
/usr/bin/python3
```

Compile-time bindings are limited to:

- installer SHA-256 + byte count;
- native-candidate SHA-256 + byte count;
- exact apply confirmation
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY`.

Deliberately **not** compile-bound:

```text
expected_head_compile_bound=false
repository_head_not_embedded_in_launcher=true
```

Runtime contract remains:

```text
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
```

The candidate report still records the exact repository HEAD/tree that produced
the evidence. That is evidence provenance, not a C preprocessor authority.

## Reproducibility boundary

The proof:

1. reads exact launcher and installer bytes from the checked-out generation;
2. independently rederives accepted native input from its reviewed helper;
3. copies launcher source into a sealed memfd;
4. compiles two static binaries from that retained source descriptor;
5. requires byte-identical output;
6. records root-protected compiler/strip/static-link input identities;
7. revalidates those tool identities after build;
8. requires no PT_INTERP and no dynamic NEEDED entry;
9. runs only V2 inert `--self-test`.

Hosted CI derives independently in three lanes. A compare job requires all three
reports and launcher ELFs to be byte-identical, then independently rederives
both again.

## Strict semantic report validation

Candidate ID content-addressing alone is not treated as semantic validation.

The report validator independently checks:

- exact repository generation for the report;
- exact V2 launcher and installer source identities;
- exact accepted native input/deriver identities;
- exact compile-binding schema;
- `expected_head_compile_bound=false`;
- runtime-head admission/forwarding flags;
- exact confirmation binding;
- exact compiler, strip, flags and current static-link input bytes;
- exact launcher binary identity;
- closed authority schema.

Adversaries rewrite and re-address:

- launcher source binding;
- compile-time HEAD authority;
- confirmation;
- compiler flags.

All must still fail validation.

## Merge-generation behavior

A PR candidate is preview evidence only.

The workflow also runs on pushes to `main`. After a future source merge, the
main-branch run must derive a canonical candidate report bound to the exact merge
generation. Because repository HEAD is not embedded into the launcher, the
binary itself is expected to remain generation-independent when all real build
inputs are unchanged.

A separate acceptance lock must bind the canonical post-merge report/binary
identity before materialization or installation.

## Authority

All remain false:

```text
candidate_accepted=false
protected_install_authorized=false
precision_install_authorized=false
native_or_binder_live_execution_authorized=false
credential_access=false
private_key_access=false
signing=false
transaction=false
payment_acceptance=false
customer_safe_to_pay=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

No Precision filesystem/service/runtime action occurs.

**PROTECT THE CORE.**
