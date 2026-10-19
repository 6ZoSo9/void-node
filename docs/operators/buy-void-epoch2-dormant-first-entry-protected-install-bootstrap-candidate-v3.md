# Buy VOID Epoch-2 runtime-head protected-bootstrap candidate V3

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_V3`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

This gate derives the reproducible static candidate for the repaired runtime-head
bootstrap V3 merged by #3430.

V1 and V2 remain frozen historical evidence. V3 preserves the reviewed
native-first privileged boundary while binding the repaired inner installer V2.
It keeps repository HEAD out of compile-time authority: the operation checkout
HEAD is runtime evidence and is forwarded to the authenticated child.

## Exact source generation

The candidate binds:

- V3 bootstrap source:
  `ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3.c`;
- V3 bootstrap Git blob:
  `2c3c9ed120cc9949a0528e43be886354aa25da5a`;
- repaired #3430 inner installer V2 source:
  `ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py`;
- installer Git blob:
  `69a018c0eccedf3782055c56725579d02463b05e`;
- installer bytes: `58454`;
- installer SHA-256:
  `6db5c9520af7070056acfd854d79219053fbcb561f63e7530423974ddd80562a`;
- exact apply confirmation:
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V2_CREATE_ONLY`.

The report records exact repository HEAD/tree for source provenance. Those values
are **not** compiled into the V3 executable.

## Runtime-head model

V3 must not contain or require
`VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD`.

Instead the source contract requires:

- plan/apply `--expected-head` to be exactly 40 lowercase hexadecimal
  characters;
- a bounded `expected_head[41]` request field;
- exact forwarding of the supplied value into the sealed repaired V2 installer
  child;
- the repaired V2 installer to authenticate clean branch `main`, actual
  checkout HEAD equality, and its accepted lock/source identities.

The candidate report therefore records:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
```

The proof also rejects a derived ELF if the exact repository HEAD bytes appear
inside the bootstrap binary.

## Production defaults

Candidate compilation preserves:

```text
/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v3
/home/zoso/dev/void-node/ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py
/usr/bin/python3
```

The compile-time bindings are limited to:

- exact repaired inner-installer V2 SHA-256 and byte count;
- exact fixed installer pathname;
- fixed V3 root;
- fixed Python policy location;
- exact apply confirmation.

No repository HEAD macro is supplied.

## Deterministic derivation

The proof retains the reviewed V2 candidate controls while using a new V3
identity namespace:

1. verify exact V3 bootstrap and repaired V2 installer Git blobs;
2. verify repaired installer byte count and SHA-256;
3. copy V3 source into a sealed Linux memfd;
4. compile two independent static binaries;
5. require binary and static-link inventory byte identity;
6. bind root-protected compiler and strip identities;
7. require no `PT_INTERP` and no dynamic `NEEDED`;
8. execute only the V3 binary's inert `--self-test`;
9. revalidate compiler, strip and static-link inputs;
10. semantically validate the candidate report, not merely its candidate ID;
11. reject readdressed source, confirmation, runtime-head and toolchain claims.

Hosted CI uses three independent derivation lanes and a fourth independent
comparison/rederivation.

## Candidate identity

Candidate IDs use:

`voidbuye2bootstrapcand3_<sha256>`

The report is source-generation-addressed, so a future canonical-main post-merge
report may have a different candidate ID even when the static V3 binary remains
byte-identical. A later acceptance lock must use the exact reviewed canonical
hosted generation; no V1/V2 candidate or lock is repinned as V3.

## Relationship to #3413

This candidate gate proves reproducible native bytes for the repaired V3 source
generation. It does **not** by itself close #3413's broader immutable-dependency
manifest and prechild/private-proof requirements.

Repository-local Git object-store indirection and the complete frozen dependency
manifest remain separate reviewed work. Candidate acceptance must not be treated
as Precision apply authority or as proof that every future runtime dependency
has been frozen.

## Authority

Every action field remains false:

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
production_host_evidence_authority=false
```

This gate performs no Precision filesystem/service mutation, bootstrap install
or execution, protected-installer apply, key/credential access, signing,
RPC/transaction, payment acceptance, presale/WC activation,
treasury/liquidity action, or funds movement.

**PROTECT THE CORE.**
