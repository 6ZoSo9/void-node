# Buy VOID Epoch-2 dormant first-entry protected-install bootstrap candidate V1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_V1`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

This is the reproducible static-bootstrap candidate gate that follows #3401.

It derives the native privileged-first-entry bootstrap without installing it or
running the real protected installer.

## Exact source generation

The candidate binds:

- bootstrap source:
  `ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v1.c`;
- bootstrap source Git blob:
  `243583d4ed0522796b2bbf448abd4e9c28958f50`;
- merged #3391 installer source:
  `ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py`;
- installer Git blob:
  `383b84e71b371de65579e4113469e86a59b807ab`;
- installer bytes: `42054`;
- installer SHA-256:
  `e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef`;
- confirmation:
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY`.

The bootstrap is compile-bound to the exact checkout HEAD running derivation.

## Production defaults preserved

Candidate compilation deliberately retains the reviewed production defaults:

```text
/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v1
/home/zoso/dev/void-node/ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py
/usr/bin/python3
```

The candidate does not substitute a test root, fixture installer, or alternate
Python.

## Deterministic derivation

The proof:

1. validates exact reviewed bootstrap/installer Git blobs;
2. verifies the installer byte count and SHA-256;
3. copies the bootstrap source into a sealed Linux memfd;
4. compiles two independent static binaries from that retained sealed source;
5. requires the binaries and static-link input inventories to be byte-identical;
6. binds root-protected compiler and strip identities;
7. requires no `PT_INTERP` and no dynamic `NEEDED`;
8. executes only the candidate binary's inert `--self-test`;
9. revalidates the compiler and strip identities after derivation.

Hosted CI performs three independent derivation lanes and a fourth independent
comparison/rederivation.

The candidate report validator is deliberately semantic rather than merely
content-addressed. It independently rechecks the exact repository head/tree,
bootstrap and installer source identities, compile-time confirmation/defaults,
current compiler/strip identities, current static-link input identities, binary
identity/properties, and the closed authority schema. Adversaries modify source,
confirmation, and toolchain claims, recompute a syntactically valid candidate
ID, and must still fail validation.

The pull-request candidate remains preview-only. The workflow also triggers on
a future canonical-main generation so an accepted lock can use a candidate
compiled against an exact accepted HEAD rather than assuming a draft commit is
production authority.

## What this does not prove

This candidate does not establish:

- root installation of the bootstrap;
- a root-custodied Python policy;
- installed bootstrap/Python/source qualification;
- authorization to invoke #3391 apply;
- accepted dormant-binder launcher/native installation;
- any service or runtime mutation;
- payment or presale readiness.

Those remain separate gates.

## Authority

Every acceptance/action field remains false:

```text
candidate_accepted=false
protected_bootstrap_install_authorized=false
protected_installer_apply_authorized=false
live_execution_authorized=false
credential_access=false
private_key_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

**PROTECT THE CORE.**
