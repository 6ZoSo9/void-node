# Buy VOID Epoch-2 runtime-head protected-bootstrap candidate V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_V2`.

Status: **source/CI-only candidate derivation; unaccepted and not installed**.

## Purpose

This gate derives the reproducible static candidate for the runtime-head V2
bootstrap introduced by #3417.

V1 remains frozen. V2 removes the lifecycle-deadlocking compile-time repository
HEAD while retaining the same native-first privileged boundary around the exact
#3391 installer.

## Exact source generation

The candidate binds:

- V2 bootstrap source:
  `ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2.c`;
- V2 bootstrap Git blob:
  `19f9baf8d6d707da43dbd0e247667af1a10e46c5`;
- merged #3391 installer source:
  `ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py`;
- installer Git blob:
  `383b84e71b371de65579e4113469e86a59b807ab`;
- installer bytes: `42054`;
- installer SHA-256:
  `e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef`;
- exact confirmation:
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY`.

The report still records exact repository HEAD/tree for source provenance.
Those values are **not** compiled into the V2 executable.

## Runtime-head model

V2 must not contain or require
`VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD`.

Instead the source contract requires:

- plan/apply `--expected-head` to be exactly 40 lowercase hexadecimal
  characters;
- a bounded `expected_head[41]` request field;
- exact forwarding of the supplied value into the sealed #3391 child;
- #3391 to authenticate clean branch `main`, actual checkout HEAD equality,
  and accepted lock/source identities.

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
/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v2
/home/zoso/dev/void-node/ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py
/usr/bin/python3
```

The compile-time bindings are limited to:

- exact #3391 installer SHA-256 and byte count;
- exact fixed installer pathname;
- fixed V2 root;
- fixed Python policy location;
- exact apply confirmation.

No repository HEAD macro is supplied.

## Deterministic derivation

The proof retains the V1 candidate controls:

1. verify exact V2 bootstrap and #3391 source Git blobs;
2. verify #3391 byte count and SHA-256;
3. copy V2 source into a sealed Linux memfd;
4. compile two independent static binaries;
5. require binary and static-link inventory byte identity;
6. bind root-protected compiler and strip identities;
7. require no `PT_INTERP` and no dynamic `NEEDED`;
8. execute only the V2 binary's inert `--self-test`;
9. revalidate compiler, strip and static-link inputs;
10. semantically validate the candidate report, not merely its candidate ID;
11. reject readdressed source, confirmation, runtime-head and toolchain claims.

Hosted CI uses three independent derivation lanes and a fourth independent
comparison/rederivation.

## Candidate identity

Candidate IDs use:

`voidbuye2bootstrapcand2_<sha256>`

The report is source-generation-addressed, so a future canonical-main
post-merge report may have a different candidate ID even when the static V2
binary remains byte-identical. A later acceptance lock must use the exact
reviewed hosted generation.

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
```

This gate performs no Precision filesystem/service mutation, bootstrap install
or execution, #3391 apply, key/credential access, signing, RPC/transaction,
payment acceptance, presale/WC activation, treasury/liquidity action, or funds
movement.

**PROTECT THE CORE.**
