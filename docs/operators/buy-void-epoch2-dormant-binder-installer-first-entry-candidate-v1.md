# Buy VOID Epoch-2 dormant-binder installer first-entry candidate V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_V1`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

Merged #3382 established the authenticated native first-entry source boundary for
the dormant-binder protected installer. This candidate gate derives the exact
static launcher binary for the repository generation executing the proof.

It does not install the launcher on Precision and does not authorize protected
installer apply.

## Accepted native input

The derivation binds accepted dormant-binder candidate lock V3:

`voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a`.

Rather than trusting an old downloaded ELF, the proof executes the exact accepted
V2 native-candidate derivation helper from verified Git bytes. That helper
rederives the native ELF from its sealed source snapshot and root-protected
toolchain.

The result must exactly equal:

- candidate ID
  `voidbuye2dormantbindercand2_8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d`;
- native SHA-256
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`;
- native bytes `726976`.

Any rederivation mismatch fails closed.

## Exact launcher source generation

The candidate proof binds:

- first-entry launcher source Git blob
  `5f1195d0c0a328be4334ad5b7f6e32b150776cab`;
- authenticated protected-installer source Git blob
  `f3d6b1559be7490303cf36338c4bfa38fdaa390a`;
- accepted native-candidate lock V3 Git blob
  `5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1`;
- accepted native-candidate derivation helper Git blob
  `f97cb8aff642f2f3e138fe8e087eece22223b934`.

The launcher candidate is compile-bound to the exact repository HEAD executing
the derivation.

## Production namespace defaults

Candidate compilation deliberately does **not** override the launcher's default
production root or Python path. The binary therefore retains:

```text
/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1
/usr/bin/python3
```

The required build-time bindings are supplied from verified bytes:

- installer SHA-256 and byte count;
- accepted native ELF SHA-256 and byte count;
- exact repository HEAD;
- exact confirmation token
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY`.

## Sealed source and toolchain boundary

Before compilation, exact reviewed launcher-source bytes are copied into a
sealed Linux memfd with write/grow/shrink/seal protections.

The proof then:

1. compiles two launcher binaries from that sealed descriptor;
2. requires those two binaries to be byte-identical;
3. requires compiler and strip binaries to resolve beneath root-owned,
   non-group/world-writable ancestry;
4. records compiler identity/version/target;
5. records root-protected static-link input byte identities;
6. revalidates compiler and strip identities after the build;
7. requires no `PT_INTERP` and no dynamic `NEEDED` dependency;
8. executes only the launcher's inert `--self-test`.

Hosted CI derives the candidate independently in three lanes. A fourth compare
job requires byte-identical reports and binaries, then independently rederives
both again.

## Merge-generation behavior

On a pull request, the candidate is bound to the exact PR head and remains
unaccepted evidence.

The workflow also runs on pushes to `main`. After this source gate is merged,
the main-branch run therefore derives a new launcher candidate bound to the exact
canonical merge generation. A later acceptance/lock gate may consume that
hosted identity.

A draft or pull-request candidate must not be treated as the final production
launcher merely because it is reproducible.

## Authority

The candidate report keeps all of these false:

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

CI writes only candidate report/binary artifacts under runner temporary storage.
It performs no `/opt` installation, service/systemd mutation, credential or key
access, signing, transaction/RPC action, payment acceptance, presale/WC
activation, or funds movement.

**PROTECT THE CORE.**
