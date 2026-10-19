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
0ada7fde0d90c3946b10693f4621cbd690bfcde6
```

Read-only source audits proved that the source advance is exactly fifteen
ADD-only files introduced by PRs #3532, #3534, and #3536, while the installed
live release and the Epoch-2 protected policy remain intentionally bound to the
earlier runtime head.

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
head=0ada7fde0d90c3946b10693f4621cbd690bfcde6
tree=9e930fba9aacfafb5b163767302786cd7f31c81e
```

The newer source tree must equal the complete runtime tree plus exactly these
fifteen tracked additions, with exact mode, Git blob, and byte size:

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

100644 f2bfa4df16c4c4a69be275dd504b7a458512e7db 5672
  .github/workflows/buy-void-v7-protected-substrate-install-v2.yml

100644 a6d81892b9493258e7c8f4aaf8ac4981955ec42a 4628
  docs/operators/buy-void-v7-protected-substrate-install-v2.md

100755 aae2d1a011053ea0665bf07972d9670cca73f6da 36881
  ops/precision/void_buy_void_v7_protected_substrate_install_v2.py

100755 7d09250dab932971e18171d667bfb98994e05e7e 7950
  scripts/prove_buy_void_v7_protected_substrate_install_v2.py

100644 c689997ecdf97e58c3fedf96a7cae2fb6f76c8a2 4403
  .github/workflows/buy-void-v7-materializer-v2-install-v3.yml

100644 91a9c04c02ba4ddbe5417e03b73efe0e71605e81 1980
  docs/operators/buy-void-v7-materializer-v2-install-v3.md

100755 4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38 36987
  ops/precision/void_buy_void_v7_protected_substrate_install_v3.py

100755 474614da950db72082fb95a5174405ce8caf2513 7922
  scripts/materialize_buy_void_v7_protected_substrate_v2.py

100755 c853547fe037ced8fbaa63da11987343c9f0ee4e 4030
  scripts/prove_buy_void_v7_materializer_v2_install_v3.py
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
5. exact fifteen-path ADD-only relation;
6. exact stage-zero index equality to the current source tree;
7. no-follow bounded reads of every tracked current-source file;
8. raw Git-blob and executable-mode equality for every tracked file; and
9. final source head, tree, branch, and index reobservation.

As in V2, untracked paths are not enumerated and do not become source authority.

## Installed-runtime view

The inherited V5 installed qualifier still receives the exact installed/runtime
head `4c80887a...`.

Only after the exact `0ada7fde...` source generation is authenticated does V3
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
source_checkout_head=0ada7fde0d90c3946b10693f4621cbd690bfcde6
source_checkout_tree=9e930fba9aacfafb5b163767302786cd7f31c81e
source_runtime_add_only_compatibility_exact=true
source_runtime_added_path_count=15
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


## Third source-only main advance

After the ten-path compatibility generation was green, `main` advanced from
`fa3cda59b8ea00f1bff9a936179ba0ef94d9d0de` to
`0ada7fde0d90c3946b10693f4621cbd690bfcde6` by merging #3536.

That merge adds exactly five V7 materializer/installer source-and-CI files and
modifies no pre-existing runtime path. Combined with the six #3532 additions and
four #3534 additions, V3 now requires exactly fifteen additions over runtime head
`4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`.

The allowlist remains finite and exact. A sixteenth tracked addition, deletion,
rename, mode change, or modification of any runtime path is HOLD.
