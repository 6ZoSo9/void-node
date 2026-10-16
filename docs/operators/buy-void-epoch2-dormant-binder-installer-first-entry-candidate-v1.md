# Buy VOID Epoch-2 dormant-binder installer first-entry candidate V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_V1`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

Derive one deterministic static native candidate for the authenticated
dormant-binder installer first-entry source merged through #3382 and freeze its
installer operation against one exact reviewed repository generation.

Frozen source parent:

`adc5a87d0200aa354b03d9910cbfc1cb2d59bb38`

Frozen source tree:

`bdd7790ee344b103e15fa1de842652ad1a83188d`

The frozen generation contains:
- accepted dormant-binder candidate lock V3;
- authenticated protected installer V2;
- authenticated native first-entry source;
- installed read-only qualification V2R.

## Build input authority

The candidate proof does not compile from the visible PR-checkout source path.

It:
1. resolves the exact frozen source parent and tree;
2. obtains the launcher source using the exact Git object at the frozen parent;
3. verifies Git blob
   `5f1195d0c0a328be4334ad5b7f6e32b150776cab`;
4. copies those verified bytes into a Linux sealable memfd;
5. applies WRITE/GROW/SHRINK/SEAL seals before compilation;
6. compiles only from the inherited `/proc/self/fd/<fd>` source;
7. rejects any post-seal write authority;
8. revalidates source objects and the complete recorded toolchain after build.

The visible checkout pathname is therefore not compiler input authority.

## Compile-bound production identities

The candidate is compiled with the production default root and Python path and
with exact definitions for:

- authenticated installer source SHA-256 and byte count, derived from exact
  installer Git blob
  `f3d6b1559be7490303cf36338c4bfa38fdaa390a`;
- accepted dormant-binder native SHA-256
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`;
- accepted dormant-binder native byte count `726976`;
- expected repository head
  `adc5a87d0200aa354b03d9910cbfc1cb2d59bb38`;
- exact installer confirmation token
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY`.

The accepted V3 lock is re-read from the frozen Git object and must remain:

`voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a`.

The accepted dormant candidate remains:

`voidbuye2dormantbindercand2_8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d`.

## Native properties

Each hosted lane builds the launcher twice and requires byte-identical stripped
ELFs. The candidate must be:

- ELF64 little-endian;
- x86-64;
- statically linked;
- free of `PT_INTERP`;
- free of dynamic `NEEDED` entries;
- byte-identical across the two local builds;
- exact-self-test GREEN;
- unchanged under a hostile `LD_PRELOAD` environment.

Compiler, strip/readelf tools and the recorded static link inputs must resolve
beneath root-owned, non-group/world-writable ancestry. Their full identities
are recorded and revalidated after the build.

## Hosted evidence

Three independent Ubuntu 24.04 lanes derive:
- canonical `candidate-v1.json`;
- stripped `installer-first-entry-v1` ELF.

A fourth compare job:
- requires all three reports byte-identical;
- requires all three ELFs byte-identical;
- independently rederives the report and ELF once more;
- requires exact equality with the hosted artifacts.

## Bound source evidence

The report additionally binds:
- first-entry proof Git blob
  `40affd58e8618567296e1a62d2c51f9edcc736e8`;
- protected-installer proof Git blob
  `31da472f1ef1c655ae5f06da09591aefbee7c791`;
- V2R qualifier Git blob
  `c1ea5912984c552f7b929d60b93d1948c42b8e1c`.

## Authority

Candidate derivation grants no production authority:

```text
candidate_accepted=false
native_binary_identity_accepted=false
protected_install_authorized=false
installer_apply_authorized=false
dormant_binder_execution_authorized=false
credential_access=false
private_key_access=false
signing_authorized=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

No Precision install, binder execution, credential/key access, signing,
transaction/RPC, payment acceptance, presale/WC activation, treasury action or
funds movement is authorized.

A separate acceptance-lock generation is required after hosted candidate
identity settles.

PROTECT THE CORE.
