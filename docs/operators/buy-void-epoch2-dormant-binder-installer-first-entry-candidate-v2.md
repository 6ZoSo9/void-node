# Buy VOID Epoch-2 dormant-binder installer first-entry candidate V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_V2`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

This gate derives the reproducible static candidate for #3436's runtime-head
first-entry launcher V2.

Historical launcher V1 and candidate V1 remain frozen. V2 removes the
self-expiring compile-time repository HEAD while preserving the native-first
authenticated child boundary.

## Exact source generation

The candidate proof binds:

- launcher V2 source
  `ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_v2.c`;
- launcher V2 Git blob
  `86dc09e52402c04fb6e4b30a7fcf695833808ca3`;
- protected Python installer
  `ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py`;
- installer Git blob
  `f3d6b1559be7490303cf36338c4bfa38fdaa390a`;
- accepted dormant-binder native lock V3
  `voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a`;
- native lock Git blob
  `5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1`;
- accepted native ELF SHA-256
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`;
- accepted native bytes `726976`.

The native input is independently rederived from the exact verified V2 native
candidate proof rather than trusted from a mutable downloaded artifact.

## Runtime-head binary model

Candidate compilation does **not** define:

`VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_EXPECTED_HEAD`

The derived ELF therefore does not bind one repository generation for future
execution.

The report records the exact repository HEAD/tree that produced the candidate
as source provenance, while its compile binding records:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_launcher=true
```

The proof fails if the exact repository HEAD bytes occur in the launcher ELF.

The launcher itself still requires a future runtime `--expected-head` and
passes that authenticated value unchanged through the private parent proof and
sealed Python child.

## Preserved compile-time security bindings

V2 still compile-binds:

- exact protected-installer SHA-256 and byte count;
- exact accepted native SHA-256 and byte count;
- exact apply confirmation
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY`.

The production Python default remains fixed at `/usr/bin/python3`.

The accepted #3436 repair deliberately keeps the launcher's **installed
pathname contract** equal to the historical V1 path authenticated by the frozen
Python child:

```text
/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1/bin/
  void_buy_void_epoch2_dormant_binder_installer_first_entry_v1
```

This is pathname/provenance compatibility only: the source marker and runtime
HEAD contract are V2. The candidate proof requires this exact compatibility
path in the reviewed C source. It does not authorize replacing an existing V1
installation or migrating host state.

No fixture root or Python override is used by the production candidate
derivation.

## Deterministic derivation

The V1 candidate controls are preserved:

1. verify exact reviewed launcher/installer/native-lock/proof blobs;
2. independently rederive the accepted native ELF;
3. copy launcher source into a sealed memfd;
4. build two independent static launcher binaries;
5. require byte-identical launcher output and static-link inventories;
6. bind root-protected compiler, strip, and static-link input identities;
7. require no `PT_INTERP` and no dynamic `NEEDED`;
8. run only the inert launcher `--self-test`;
9. revalidate compiler and strip identities after build;
10. semantically validate the candidate report.

The semantic validator rejects readdressed:
- launcher-source identity;
- apply-confirmation identity;
- runtime-head contract;
- compiler/linker flags.

Candidate IDs use:

`voidbuye2dormantfirstentrycand2_<sha256>`.

## Hosted evidence

CI derives the exact candidate in three independent lanes. A separate compare
job requires:

- three report byte identity;
- three launcher ELF byte identity;
- independent report rederivation;
- independent launcher ELF rederivation.

The workflow also runs after merge on `main`. Because HEAD is report
provenance rather than ELF compile authority, a post-merge report/candidate ID
may change while the launcher ELF remains byte-identical. A later acceptance
lock must use the exact canonical post-merge hosted report.

## Authority

Always false:

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

CI writes only temporary candidate artifacts on hosted runners. It performs no
Precision mutation, launcher installation/execution beyond inert self-test,
protected-installer apply, service action, credentials/keys, signing,
transaction/RPC, payment acceptance, presale/WC activation, treasury action, or
funds movement.

**PROTECT THE CORE.**
