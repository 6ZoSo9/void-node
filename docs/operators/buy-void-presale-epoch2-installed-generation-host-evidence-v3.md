# Buy VOID presale Epoch-2 installed-generation host evidence V3

Marker:
`VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V3`.

Status: **source/CI-only compatibility repair; no Precision host collection is authorized or performed by this gate**.

## Purpose

The separately authorized V3 Precision retry held before collector execution because
canonical `main` advanced after the retry plan was sealed:

```text
runtime / installed policy head:
4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb

canonical source main:
fa3cda59b8ea00f1bff9a936179ba0ef94d9d0de
```

A read-only Precision diagnostic proved that the source advance is exactly the
ten ADD-only files merged by PR #3532, while the installed live release and the
Epoch-2 protected policy remain intentionally bound to the earlier runtime head.

Changing the installed qualifier's `expected_head` to the newer source head would
be incorrect: the protected policy includes the earlier exact head. Rewinding or
mutating the canonical checkout would also be incorrect.

V3 therefore introduces an exact **source/runtime compatibility view**.

## Exact inherited source

V3 descriptor-loads exact V2 source blob:

```text
a00fe6b094e97eb5c8bcf0eeb630d0d39e3498e2
```

V2 continues to descriptor-load exact V1 source blob:

```text
6b2bf387bff5e5cd6ada048fd5c8fe4d28d66577
```

The V2 untracked-data repair, isolated Python boundary, descriptor loading, exact
tracked-file authentication, installed qualifier, retained native self-tests,
close-failure normalization, and negative authority contract remain inherited.

## Exact compatibility transition

Runtime generation:

```text
4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
```

Permitted canonical source generation:

```text
head=fa3cda59b8ea00f1bff9a936179ba0ef94d9d0de
tree=8cf585e4e32f085520b5f3536101e082f284f9e7
```

The newer source tree must equal the complete runtime tree plus exactly these six
tracked additions, with exact mode, Git blob, and byte size:

```text
100644 78190cd9f71e4dd0ee4f7fdc1144b70fc644db8c 967
  docs/operators/buy-void-v7-protected-substrate-source-proposal-v3.md

100755 9f7f035b814549dad9cc6eeee3620d2c04b95d8a 4762
  ops/precision/void_buy_void_v7_protected_substrate_install_v1.py

100755 56a7ca798553766af525d9fb1ccbe58b70fe9c1d 11949
  ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v2.py

100644 831f6e3f79a62a334662cebc6d2c39133bc7a309 2756
  ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json

100755 62d7427577a38fbd69c8405b66951cfb46a28b37 4706
  scripts/materialize_buy_void_v7_protected_substrate_v1.py

100755 568bd08c6c3a120864a6b4f69a8d5b5cb41f5f72 3464
  scripts/prove_buy_void_v7_protected_substrate_source_proposal_v3.py
```

No modified, deleted, renamed, mode-changed, or additional tracked path is
compatible.

## Current checkout authentication

V3 authenticates the current source generation independently of the installed
runtime generation:

1. exact source head and tree;
2. direct `main` branch;
3. complete runtime tree inventory;
4. complete current source tree inventory;
5. exact six-path ADD-only relation;
6. exact stage-zero index equality to the current source tree;
7. no-follow bounded reads of every tracked current-source file;
8. raw Git-blob and executable-mode equality for every tracked file; and
9. final source head, tree, branch, and index reobservation.

As in V2, untracked paths are not enumerated and do not become source authority.

## Installed-runtime view

The inherited V5 installed qualifier still receives the exact installed/runtime
head `4c80887a...`.

Only after the exact `44f7cf57...` source generation is authenticated does V3
adapt the inherited installer's read-only Git interface:

- `rev-parse --verify HEAD` returns the runtime head;
- `branch --show-current` remains `main`;
- the inherited status query triggers the full source/runtime compatibility
  verification and returns the clean runtime-source view;
- each reviewed `HEAD:<dependency>` query is translated to the exact runtime
  object and must have the same blob at the current source head.

This does not claim that canonical source `HEAD` is the runtime head. The final
V3 receipt reports both generations explicitly.

## Receipt truth

A future GREEN V3 receipt states, among other inherited evidence:

```text
runtime_expected_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
source_checkout_head=fa3cda59b8ea00f1bff9a936179ba0ef94d9d0de
source_checkout_tree=8cf585e4e32f085520b5f3536101e082f284f9e7
source_runtime_add_only_compatibility_exact=true
source_runtime_added_path_count=10
main_source_advance_runtime_non_authority=true
canonical_checkout_rewind_performed=false
canonical_checkout_mutation_performed=false
```

## Fail-closed cases

Hosted proof requires rejection of:

- any modified pre-existing runtime path;
- unexpected added tracked path;
- tracked byte drift;
- executable-mode drift;
- index drift;
- wrong runtime expected head;
- wrong source head/tree; and
- any reviewed runtime dependency whose blob differs at the source head.

## Authority

Even a future GREEN V3 host receipt keeps false:

```text
filesystem_write_performed=false
runner_execution=false
live_composition_execution=false
service_mutation=false
network_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction_submission=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_or_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

This source gate does not rewind `main`, change the installed release, rewrite the
Epoch-2 policy, restart a service, perform the custody rollback challenge, accept
payment, activate the presale/WC market, or move funds.

**PROTECT THE CORE.**


## V3 descriptor cleanup normalization

V3's own descriptor reader for exact V2 source bytes uses the same fail-closed
cleanup contract: all owned final descriptors are attempted exactly once; close-time
failures become `EvidenceError`; and an existing primary evidence reason remains
the prefix when cleanup also fails. Intermediate ancestor traversal transfers
ownership before closing the old descriptor, so an ambiguous close-time failure is
never followed by a retry of the consumed numeric FD. Hosted proof exercises real
close-then-error adversaries for final descriptors and ancestor traversal. V3 also
uses the inherited lexical+resolved `sys.path` containment model, including rejection
of a lexical checkout descendant that symlinks to an outside import directory.


## Second source-only main advance

After this V3 generation was first published, `main` advanced from
`44f7cf576cdc4460397677a27af2f587a33d424d` to
`fa3cda59b8ea00f1bff9a936179ba0ef94d9d0de` by merging #3534.

That delta is exactly four additional ADD-only V7 protected-substrate installer V2
source/CI files. Combined with the prior #3532 six-file source-only advance, V3 now
requires the current source tree to equal runtime head
`4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb` plus exactly ten reviewed additions.
No arbitrary future additions are accepted.
